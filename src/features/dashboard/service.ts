import "server-only"

import { prisma } from "@/lib/prisma"
import { todayInAppTz, appDayBounds, appMonthBounds } from "@/lib/date-helper"

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
        const [collectedAgg, expectedAgg, collectedForOutstanding, recentPayments] =
          await Promise.all([
            prisma.feePayment.aggregate({
              where: { instituteId, paidAt: { gte: monthStart, lt: monthEnd } },
              _sum: { amount: true },
            }),
            prisma.student.aggregate({
              where: activeWhere,
              _sum: { monthlyFee: true },
            }),
            prisma.feePayment.aggregate({
              where: { instituteId, periodMonth: tm, periodYear: ty },
              _sum: { amount: true },
            }),
            prisma.feePayment.findMany({
              where: { instituteId },
              orderBy: { paidAt: "desc" },
              take: 5,
              include: { student: { select: { fullName: true } } },
            }),
          ])
        const expected = Number(expectedAgg._sum.monthlyFee ?? 0)
        const collectedForMonth = Number(collectedForOutstanding._sum.amount ?? 0)
        return {
          feeCollectedThisMonth: Number(collectedAgg._sum.amount ?? 0),
          outstandingThisMonth: Math.max(0, expected - collectedForMonth),
          recentPayments: recentPayments.map((p) => ({
            id: p.id,
            studentName: p.student.fullName,
            amount: Number(p.amount),
            paidAt: p.paidAt,
            receiptNo: p.receiptNo,
          })),
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
