import "server-only"

import { prisma } from "@/lib/prisma"
import { todayInAppTz, appDayBounds, appMonthBounds } from "@/lib/date-helper"
import { effectiveFee } from "@/features/fees/logic"

export type DashboardFinance = {
  feeCollectedThisMonth: number
  outstandingThisMonth: number
  recentPayments: {
    id: string
    studentName: string
    amount: number
    paidAt: Date
    receiptNo: number
  }[]
}

export type DashboardStats = {
  totalStudents: number
  attendance: {
    present: number
    absent: number
    leave: number
    notMarked: number
  }
  // null when the viewer lacks fee:read. The financial queries are never run for
  // them (see below), so the numbers can't leak through the RSC payload — this
  // is the real authorization boundary, not just UI hiding.
  finance: DashboardFinance | null
}

/**
 * Computes the dashboard summary for one institute. All queries are scoped by
 * instituteId — the tenant boundary. "Outstanding" is the current month's
 * expected fees (active students × monthly fee) minus what's been collected.
 *
 * Financial figures (collected/outstanding/recent payments) are only computed
 * when `includeFinancials` is true — the caller must pass the result of a
 * fee:read permission check. Without it, those queries don't execute at all.
 */
export async function getDashboardStats(
  instituteId: string,
  opts: { includeFinancials: boolean }
): Promise<DashboardStats> {
  const todayIST = todayInAppTz()
  const [ty, tm] = todayIST.split("-").map(Number)
  const [dayStart, dayEnd] = appDayBounds(todayIST)
  const monthStr = `${ty}-${String(tm).padStart(2, "0")}`
  const [monthStart, monthEnd] = appMonthBounds(monthStr)

  const activeWhere = { instituteId, status: "ACTIVE" as const, archivedAt: null }

  // Wave 1: the active-student list (always needed) runs alongside the financial
  // bundle. The fee/payment queries execute ONLY when the viewer has fee:read —
  // otherwise `finance` resolves to null and nothing financial is ever fetched.
  const financeWork: Promise<DashboardFinance | null> = opts.includeFinancials
    ? (async () => {
        const [collectedAgg, expectedEnrollments, collectedForOutstanding, recentPayments] =
          await Promise.all([
            prisma.feePayment.aggregate({
              where: { instituteId, paidAt: { gte: monthStart, lt: monthEnd } },
              _sum: { amount: true },
            }),
            // Expected this month = Σ active enrolments' effective fee (started by
            // this month), for active students — the charge ledger's monthly rate.
            prisma.enrollment.findMany({
              where: {
                instituteId,
                status: "ACTIVE",
                startDate: { lt: monthEnd },
                student: { status: "ACTIVE", archivedAt: null },
              },
              select: {
                feeOverride: true,
                discountPercent: true,
                course: { select: { monthlyFee: true } },
              },
            }),
            prisma.feePayment.aggregate({
              where: { instituteId, periodMonth: tm, periodYear: ty },
              _sum: { amount: true },
            }),
            // Recent payments = money actually received. Skip reversal rows (the
            // negative credit notes), and pull each original's own reversals so we
            // can net them below. Over-fetch, then filter + slice to 5, since some
            // of the latest rows may be fully reversed and drop out.
            prisma.feePayment.findMany({
              where: { instituteId, reversalOfId: null },
              orderBy: { paidAt: "desc" },
              take: 20,
              include: {
                student: { select: { fullName: true } },
                reversals: { select: { amount: true } },
              },
            }),
          ])
        const expected = expectedEnrollments.reduce(
          (sum, e) =>
            sum +
            effectiveFee(
              Number(e.course.monthlyFee),
              e.feeOverride != null ? Number(e.feeOverride) : null,
              e.discountPercent != null ? Number(e.discountPercent) : null
            ),
          0
        )
        const collectedForMonth = Number(collectedForOutstanding._sum.amount ?? 0)
        return {
          feeCollectedThisMonth: Number(collectedAgg._sum.amount ?? 0),
          outstandingThisMonth: Math.max(0, expected - collectedForMonth),
          recentPayments: recentPayments
            .map((p) => {
              // Reversal rows are negative, so adding them nets the payment down to
              // what was actually kept: fully reversed → 0 (dropped below), partial
              // → the remaining amount.
              const reversed = p.reversals.reduce((s, r) => s + Number(r.amount), 0)
              const net = Math.round((Number(p.amount) + reversed) * 100) / 100
              return {
                id: p.id,
                studentName: p.student.fullName,
                amount: net,
                paidAt: p.paidAt,
                // Non-reversal rows always carry a receipt number (filtered above).
                receiptNo: p.receiptNo ?? 0,
              }
            })
            .filter((p) => p.amount > 0)
            .slice(0, 5),
        }
      })()
    : Promise.resolve(null)

  const [activeStudents, finance] = await Promise.all([
    prisma.student.findMany({ where: activeWhere, select: { id: true } }),
    financeWork,
  ])

  const activeStudentIds = activeStudents.map((s) => s.id)
  const attendanceWhere = {
    instituteId,
    date: { gte: dayStart, lt: dayEnd },
    studentId: { in: activeStudentIds },
  }

  // Wave 2: attendance counts, scoped to active students.
  const [present, absent, leave] = await Promise.all([
    prisma.attendance.count({ where: { ...attendanceWhere, status: "PRESENT" } }),
    prisma.attendance.count({ where: { ...attendanceWhere, status: "ABSENT" } }),
    prisma.attendance.count({ where: { ...attendanceWhere, status: "LEAVE" } }),
  ])

  return {
    totalStudents: activeStudents.length,
    attendance: {
      present,
      absent,
      leave,
      notMarked: Math.max(0, activeStudents.length - present - absent - leave),
    },
    finance,
  }
}
