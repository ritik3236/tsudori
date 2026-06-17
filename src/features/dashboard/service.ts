import "server-only"

import { prisma } from "@/lib/prisma"
import { todayInAppTz, appDayBounds, appMonthBounds } from "@/lib/date-helper"

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
  const todayIST = todayInAppTz()
  const [ty, tm] = todayIST.split("-").map(Number)
  const [dayStart, dayEnd] = appDayBounds(todayIST)
  const monthStr = `${ty}-${String(tm).padStart(2, "0")}`
  const [monthStart, monthEnd] = appMonthBounds(monthStr)

  const activeWhere = { instituteId, status: "ACTIVE" as const, archivedAt: null }

  // Wave 1: everything that doesn't depend on the active-student id list runs in
  // parallel (the fee/payment queries don't need it). Only the attendance counts
  // do, so they wait for activeStudents — but no longer block the fee queries.
  const [
    activeStudents,
    collectedAgg,
    expectedAgg,
    collectedForOutstanding,
    recentPayments,
  ] = await Promise.all([
    prisma.student.findMany({ where: activeWhere, select: { id: true } }),
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
