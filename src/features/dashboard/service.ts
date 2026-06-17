import "server-only"

import { prisma } from "@/lib/prisma"

export type DashboardStats = {
  totalStudents: number
  attendance: {
    present: number
    absent: number
    leave: number
    notMarked: number
  }
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

/**
 * Computes the dashboard summary for one institute. All queries are scoped by
 * instituteId — the tenant boundary. "Outstanding" is the current month's
 * expected fees (active students × monthly fee) minus what's been collected.
 */
export async function getDashboardStats(instituteId: string): Promise<DashboardStats> {
  const now = new Date()
  // Resolve current IST date — UTC can be one calendar day behind IST between
  // 00:00 and 05:30 IST. All date values are stored as IST midnight expressed in
  // UTC (e.g. "2026-06-17" IST → 2026-06-16T18:30:00Z).
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000
  const todayIST = new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
  const [ty, tm] = todayIST.split("-").map(Number)
  const dayStart = new Date(`${todayIST}T00:00:00+05:30`)
  const dayEnd = new Date(dayStart.getTime() + 86400000)
  const monthStr = `${ty}-${String(tm).padStart(2, "0")}`
  const monthStart = new Date(`${monthStr}-01T00:00:00+05:30`)
  const nextYear = tm === 12 ? ty + 1 : ty
  const nextMon = tm === 12 ? 1 : tm + 1
  const monthEnd = new Date(`${nextYear}-${String(nextMon).padStart(2, "0")}-01T00:00:00+05:30`)

  const activeWhere = { instituteId, status: "ACTIVE" as const, archivedAt: null }

  // Fetch active student IDs first so we can scope attendance counts to them.
  const activeStudents = await prisma.student.findMany({
    where: activeWhere,
    select: { id: true },
  })
  const activeStudentIds = activeStudents.map((s) => s.id)

  const attendanceWhere = {
    instituteId,
    date: { gte: dayStart, lt: dayEnd },
    studentId: { in: activeStudentIds },
  }

  const [
    present,
    absent,
    leave,
    collectedAgg,
    expectedAgg,
    collectedForOutstanding,
    recentPayments,
  ] = await Promise.all([
    prisma.attendance.count({ where: { ...attendanceWhere, status: "PRESENT" } }),
    prisma.attendance.count({ where: { ...attendanceWhere, status: "ABSENT" } }),
    prisma.attendance.count({ where: { ...attendanceWhere, status: "LEAVE" } }),
    prisma.feePayment.aggregate({
      where: { instituteId, paidAt: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.student.aggregate({
      where: activeWhere,
      _sum: { monthlyFee: true },
    }),
    prisma.feePayment.aggregate({
      where: {
        instituteId,
        periodMonth: tm,
        periodYear: ty,
      },
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
    totalStudents: activeStudents.length,
    attendance: {
      present,
      absent,
      leave,
      notMarked: Math.max(0, activeStudents.length - present - absent - leave),
    },
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
}
