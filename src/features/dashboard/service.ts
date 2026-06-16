import "server-only"

import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns"

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
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const activeWhere = { instituteId, status: "ACTIVE" as const, archivedAt: null }

  const [
    totalStudents,
    attendanceGroups,
    collectedAgg,
    expectedAgg,
    collectedForOutstanding,
    recentPayments,
  ] = await Promise.all([
    prisma.student.count({ where: activeWhere }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { instituteId, date: { gte: dayStart, lte: dayEnd } },
      _count: { _all: true },
    }),
    prisma.feePayment.aggregate({
      where: { instituteId, paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.student.aggregate({
      where: activeWhere,
      _sum: { monthlyFee: true },
    }),
    prisma.feePayment.aggregate({
      where: {
        instituteId,
        periodMonth: now.getMonth() + 1,
        periodYear: now.getFullYear(),
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

  const countFor = (status: "PRESENT" | "ABSENT" | "LEAVE") =>
    attendanceGroups.find((g) => g.status === status)?._count._all ?? 0

  const present = countFor("PRESENT")
  const absent = countFor("ABSENT")
  const leave = countFor("LEAVE")

  const expected = Number(expectedAgg._sum.monthlyFee ?? 0)
  const collectedForMonth = Number(collectedForOutstanding._sum.amount ?? 0)

  return {
    totalStudents,
    attendance: {
      present,
      absent,
      leave,
      notMarked: Math.max(0, totalStudents - present - absent - leave),
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
