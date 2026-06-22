import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { appYearMonth, appMonthStartUtc, nowDate } from "@/lib/date-helper"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { recordAudit, AUDIT_ACTIONS } from "@/features/audit/service"
import { deriveMonth, planPayment, planWaiver, resolveReversal } from "@/features/fees/logic"
import { FEE_PAGE_SIZE } from "@/features/fees/schema"
import type {
  FeeQuery,
  RecordPaymentInput,
  ReverseFeeInput,
  ReverseWaiverInput,
  WaiveFeeInput,
} from "@/features/fees/schema"
import type {
  FeeMonthlyOverview,
  FeeStatus,
  FeeSummary,
  PaymentItem,
  ReceiptData,
  StudentFeeDetail,
  StudentFeeListItem,
  StudentFeePage,
  WaiverItem,
} from "@/features/fees/types"

// Fees are computed, not stored: a student's status for the current month is
// derived from their monthlyFee vs. what's been paid for this fee period.
// Every function is scoped by instituteId — the tenant boundary.

// Default waiver reasons, autofilled when staff don't type one. Centralized so the
// pay-and-clear flow and the manual waiver stay consistent.
const WAIVER_REASON_DEFAULT = "Fee concession"
const WAIVER_REASON_SETTLE = "Balance waived to settle dues"
const WAIVER_REASON_REVERSED = "Waiver reversed"

function currentPeriod() {
  const { year, month } = appYearMonth(nowDate())
  return { month, year }
}

type PaymentWithRecorder = Prisma.FeePaymentGetPayload<{
  include: { recordedBy: { select: { name: true } } }
}>

function toPaymentItem(p: PaymentWithRecorder, reversedAmount = 0): PaymentItem {
  return {
    id: p.id,
    amount: Number(p.amount),
    periodMonth: p.periodMonth,
    periodYear: p.periodYear,
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    receiptNo: p.receiptNo,
    note: p.note,
    recordedBy: p.recordedBy?.name ?? null,
    reversalOfId: p.reversalOfId,
    reversedAmount,
  }
}

type WaiverWithGranter = Prisma.FeeWaiverGetPayload<{
  include: { waivedBy: { select: { name: true } } }
}>

function toWaiverItem(w: WaiverWithGranter, reversedAmount = 0): WaiverItem {
  return {
    id: w.id,
    amount: Number(w.amount),
    periodMonth: w.periodMonth,
    periodYear: w.periodYear,
    reason: w.reason,
    createdAt: w.createdAt.toISOString(),
    waivedBy: w.waivedBy?.name ?? null,
    reversalOfId: w.reversalOfId,
    reversedAmount,
  }
}

/**
 * Loads every matching student's computed fee status for one month. Status is
 * derived in-app (deriveMonth) from monthly fee vs. paid vs. waived — it can't be
 * a single SQL filter — so we evaluate the whole month, then sort/slice. Shared
 * by the paged list and the month summary so both speak identical numbers.
 */
async function loadMonthFeeRows(
  instituteId: string,
  opts: { periodMonth?: number; periodYear?: number; classId?: string; q?: string }
): Promise<StudentFeeListItem[]> {
  const month = opts.periodMonth ?? currentPeriod().month
  const year = opts.periodYear ?? currentPeriod().year

  const where: Prisma.StudentWhereInput = {
    instituteId,
    archivedAt: null,
    status: "ACTIVE",
    // Only students enrolled by the selected month owe fees for it — someone
    // admitted in August isn't billed (or listed) for June/July. Cutoff is the
    // start of the NEXT month in app-tz (admitted-this-month still counts).
    admissionDate: { lt: appMonthStartUtc(year, month + 1) },
    ...(opts.classId ? { classId: opts.classId } : {}),
  }
  if (opts.q) {
    const q = opts.q
    const or: Prisma.StudentWhereInput[] = [
      { fullName: { contains: q, mode: "insensitive" } },
      { guardianName: { contains: q, mode: "insensitive" } },
    ]
    const asSerial = Number(q)
    if (Number.isInteger(asSerial)) or.push({ serialNo: asSerial })
    where.OR = or
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      serialNo: true,
      fullName: true,
      monthlyFee: true,
      contactNumber: true,
      class: { select: { name: true, section: true } },
    },
  })

  const ids = students.map((s) => s.id)
  const [grouped, waiverGroups] = await Promise.all([
    prisma.feePayment.groupBy({
      by: ["studentId"],
      where: { instituteId, periodMonth: month, periodYear: year, studentId: { in: ids } },
      _sum: { amount: true },
    }),
    prisma.feeWaiver.groupBy({
      by: ["studentId"],
      where: { instituteId, periodMonth: month, periodYear: year, studentId: { in: ids } },
      _sum: { amount: true },
    }),
  ])
  const paidMap = new Map(grouped.map((g) => [g.studentId, Number(g._sum.amount ?? 0)]))
  const waivedMap = new Map(
    waiverGroups.map((g) => [g.studentId, Number(g._sum.amount ?? 0)])
  )

  return students.map((s) => {
    const monthlyFee = Number(s.monthlyFee)
    const paid = paidMap.get(s.id) ?? 0
    const waived = waivedMap.get(s.id) ?? 0
    const { pending, advance, status } = deriveMonth(monthlyFee, paid, waived)
    return {
      studentId: s.id,
      serialNo: s.serialNo,
      fullName: s.fullName,
      className: s.class?.name ?? null,
      classSection: s.class?.section ?? null,
      monthlyFee,
      paidThisMonth: paid,
      waivedThisMonth: waived,
      pendingThisMonth: pending,
      advance,
      status,
      contactNumber: s.contactNumber,
      lastReceipt: null, // filled per page (paid rows) by listStudentFees
    }
  })
}

// Who owes first: unpaid → partial → paid → waived → advance, then by name.
const STATUS_RANK: Record<FeeStatus, number> = {
  UNPAID: 0,
  PARTIAL: 1,
  PAID: 2,
  WAIVED: 3,
  ADVANCE: 4,
}

/**
 * One offset page of the fee list, ordered who-owes-first then by name. Returns
 * the slice plus a nextOffset cursor (null when exhausted) for infinite scroll.
 */
export async function listStudentFees(
  instituteId: string,
  query: FeeQuery
): Promise<StudentFeePage> {
  let rows = await loadMonthFeeRows(instituteId, {
    periodMonth: query.periodMonth,
    periodYear: query.periodYear,
    classId: query.classId,
    q: query.q,
  })

  if (query.status) rows = rows.filter((r) => r.status === query.status)
  // "Pending only": just those who still owe this month (UNPAID/PARTIAL).
  if (query.pendingOnly) rows = rows.filter((r) => r.pendingThisMonth > 0)
  rows.sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.fullName.localeCompare(b.fullName)
  )

  const total = rows.length
  const start = query.offset
  const end = start + FEE_PAGE_SIZE
  const items = rows.slice(start, end)

  // Attach each paid row's latest receipt (for the WhatsApp confirmation, so
  // Amount/Receipt No/Date all come from one real payment). Scoped to the page's
  // paid rows — a small bounded query, not the whole month.
  const paidIds = items.filter((r) => r.paidThisMonth > 0).map((r) => r.studentId)
  if (paidIds.length) {
    const month = query.periodMonth ?? currentPeriod().month
    const year = query.periodYear ?? currentPeriod().year
    const receipts = await prisma.feePayment.findMany({
      where: {
        instituteId,
        periodMonth: month,
        periodYear: year,
        studentId: { in: paidIds },
        receiptNo: { not: null },
        reversalOfId: null,
      },
      orderBy: { receiptNo: "desc" },
      select: { studentId: true, receiptNo: true, amount: true, paidAt: true },
    })
    const latest = new Map<
      string,
      { receiptNo: number; amount: number; paidAt: string }
    >()
    for (const r of receipts) {
      if (r.receiptNo != null && !latest.has(r.studentId)) {
        latest.set(r.studentId, {
          receiptNo: r.receiptNo,
          amount: Number(r.amount),
          paidAt: r.paidAt.toISOString(),
        })
      }
    }
    for (const row of items) {
      row.lastReceipt = latest.get(row.studentId) ?? null
    }
  }

  return {
    items,
    nextOffset: end < total ? end : null,
    total,
  }
}

export async function getStudentFee(
  instituteId: string,
  studentId: string
): Promise<StudentFeeDetail> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
    select: {
      id: true,
      serialNo: true,
      fullName: true,
      guardianName: true,
      contactNumber: true,
      monthlyFee: true,
      admissionDate: true,
      class: { select: { name: true, section: true } },
    },
  })
  if (!student) throw new NotFoundError("Student not found.")

  const { month, year } = currentPeriod()
  const [totalAgg, monthAgg, payments, totalWaivedAgg, monthWaivedAgg, waivers] =
    await Promise.all([
      prisma.feePayment.aggregate({
        where: { studentId, instituteId },
        _sum: { amount: true },
      }),
      prisma.feePayment.aggregate({
        where: { studentId, instituteId, periodMonth: month, periodYear: year },
        _sum: { amount: true },
      }),
      prisma.feePayment.findMany({
        where: { studentId, instituteId },
        orderBy: { paidAt: "desc" },
        include: { recordedBy: { select: { name: true } } },
      }),
      prisma.feeWaiver.aggregate({
        where: { studentId, instituteId },
        _sum: { amount: true },
      }),
      prisma.feeWaiver.aggregate({
        where: { studentId, instituteId, periodMonth: month, periodYear: year },
        _sum: { amount: true },
      }),
      prisma.feeWaiver.findMany({
        where: { studentId, instituteId },
        orderBy: { createdAt: "desc" },
        include: { waivedBy: { select: { name: true } } },
      }),
    ])

  const monthlyFee = Number(student.monthlyFee)
  const paidThisMonth = Number(monthAgg._sum.amount ?? 0)
  const waivedThisMonth = Number(monthWaivedAgg._sum.amount ?? 0)

  // How much of each original payment has been reversed. Reversal rows hold a
  // negative amount, so the reversed total is the negation of their sum.
  const reversedByPayment = new Map<string, number>()
  for (const p of payments) {
    if (p.reversalOfId == null) continue
    reversedByPayment.set(
      p.reversalOfId,
      (reversedByPayment.get(p.reversalOfId) ?? 0) - Number(p.amount)
    )
  }

  // Same for waivers: reversal rows hold a negative amount, so reversed-so-far is
  // the negation of their sum.
  const reversedByWaiver = new Map<string, number>()
  for (const w of waivers) {
    if (w.reversalOfId == null) continue
    reversedByWaiver.set(
      w.reversalOfId,
      (reversedByWaiver.get(w.reversalOfId) ?? 0) - Number(w.amount)
    )
  }

  const futurePaid = payments.reduce((sum, p) => {
    const isFuture =
      p.periodYear != null &&
      (p.periodYear > year ||
        (p.periodYear === year && (p.periodMonth ?? 0) > month))
    return isFuture ? sum + Number(p.amount) : sum
  }, 0)
  const month0 = deriveMonth(monthlyFee, paidThisMonth, waivedThisMonth)
  const advance = month0.advance + futurePaid
  const status: FeeStatus = advance > 0 ? "ADVANCE" : month0.status

  // Lifetime outstanding: walk every billable month from admission through the
  // current period and sum each month's unmet due, capped per month so an
  // overpaid/prepaid month can't cancel out another month's shortfall.
  const paidByPeriod = new Map<string, number>()
  for (const p of payments) {
    if (p.periodYear == null || p.periodMonth == null) continue
    const k = `${p.periodYear}-${p.periodMonth}`
    paidByPeriod.set(k, (paidByPeriod.get(k) ?? 0) + Number(p.amount))
  }
  const waivedByPeriod = new Map<string, number>()
  for (const w of waivers) {
    const k = `${w.periodYear}-${w.periodMonth}`
    waivedByPeriod.set(k, (waivedByPeriod.get(k) ?? 0) + Number(w.amount))
  }
  let totalOutstanding = 0
  const adm = appYearMonth(student.admissionDate)
  let wy = adm.year
  let wm = adm.month
  while (wy < year || (wy === year && wm <= month)) {
    const k = `${wy}-${wm}`
    const paidM = paidByPeriod.get(k) ?? 0
    const waivedM = waivedByPeriod.get(k) ?? 0
    totalOutstanding += Math.max(0, monthlyFee - waivedM - paidM)
    wm += 1
    if (wm > 12) {
      wm = 1
      wy += 1
    }
  }

  return {
    studentId: student.id,
    serialNo: student.serialNo,
    fullName: student.fullName,
    className: student.class?.name ?? null,
    classSection: student.class?.section ?? null,
    guardianName: student.guardianName,
    contactNumber: student.contactNumber,
    monthlyFee,
    totalPaid: Number(totalAgg._sum.amount ?? 0),
    totalWaived: Number(totalWaivedAgg._sum.amount ?? 0),
    paidThisMonth,
    waivedThisMonth,
    pendingThisMonth: month0.pending,
    totalOutstanding,
    advance,
    status,
    payments: payments.map((p) =>
      toPaymentItem(p, reversedByPayment.get(p.id) ?? 0)
    ),
    waivers: waivers.map((w) => toWaiverItem(w, reversedByWaiver.get(w.id) ?? 0)),
    admission: { year: adm.year, month: adm.month },
    paidByMonth: Object.fromEntries(paidByPeriod),
    waivedByMonth: Object.fromEntries(waivedByPeriod),
  }
}

/**
 * Records a payment and distributes it across fee months, oldest outstanding
 * first (admission → now), then — if money is left over — prepays upcoming months.
 * One FeePayment row (and receipt) is created per month the payment touches, each
 * with its own sequential receipt number. When `waiveRemaining` is set, every
 * month still owing after the cash is waived too (one FeeWaiver row each), so the
 * student ends fully settled. Returns the rows created, in allocation order.
 */
export async function recordPayment(
  instituteId: string,
  recordedById: string | null,
  input: RecordPaymentInput
): Promise<{ payments: PaymentItem[]; waivedAmount: number }> {
  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: input.studentId, instituteId },
      select: { id: true, fullName: true, monthlyFee: true, admissionDate: true },
    })
    if (!student) throw new NotFoundError("Student not found.")

    const fee = Number(student.monthlyFee)
    const now = appYearMonth(nowDate())

    // What's already settled per month, so we only ever fill the unmet due.
    const [paidGroups, waiverGroups] = await Promise.all([
      tx.feePayment.groupBy({
        by: ["periodYear", "periodMonth"],
        where: { instituteId, studentId: student.id, periodYear: { not: null } },
        _sum: { amount: true },
      }),
      tx.feeWaiver.groupBy({
        by: ["periodYear", "periodMonth"],
        where: { instituteId, studentId: student.id },
        _sum: { amount: true },
      }),
    ])
    const key = (y: number, m: number) => `${y}-${m}`
    const paid = new Map<string, number>()
    for (const g of paidGroups) {
      if (g.periodYear == null || g.periodMonth == null) continue
      paid.set(key(g.periodYear, g.periodMonth), Number(g._sum.amount ?? 0))
    }
    const waived = new Map<string, number>()
    for (const g of waiverGroups) {
      waived.set(key(g.periodYear, g.periodMonth), Number(g._sum.amount ?? 0))
    }

    // Pure allocation: which months get how much, plus any months to waive so the
    // student is fully settled (when waiveRemaining is set).
    const plan = planPayment({
      fee,
      paid,
      waived,
      // Allocation is oldest-first; this anchor only feeds the fee=0 safety net.
      selected: {
        year: input.periodYear ?? now.year,
        month: input.periodMonth ?? now.month,
      },
      admission: appYearMonth(student.admissionDate),
      now,
      amount: input.amount,
      waiveRemaining: input.waiveRemaining,
    })

    // Persist: one FeePayment row (+ sequential receipt) per allocated month.
    // Ignore reversal rows (receiptNo NULL) so the sequence stays gap-free.
    const last = await tx.feePayment.findFirst({
      where: { instituteId, receiptNo: { not: null } },
      orderBy: { receiptNo: "desc" },
      select: { receiptNo: true },
    })
    let receiptNo = (last?.receiptNo ?? 0) + 1
    const rows: PaymentWithRecorder[] = []
    for (const a of plan.allocations) {
      const row = await tx.feePayment.create({
        data: {
          instituteId,
          studentId: student.id,
          amount: a.amount,
          periodMonth: a.month,
          periodYear: a.year,
          method: input.method,
          paidAt: input.paidAt,
          receiptNo: receiptNo++,
          note: input.note ?? null,
          recordedById,
        },
        include: { recordedBy: { select: { name: true } } },
      })
      rows.push(row)
    }

    // Clear whatever still owes after the cash, one waiver row per month.
    let waivedAmount = 0
    for (const w of plan.waiveAllocations) {
      await tx.feeWaiver.create({
        data: {
          instituteId,
          studentId: student.id,
          amount: w.amount,
          periodMonth: w.month,
          periodYear: w.year,
          reason: WAIVER_REASON_SETTLE,
          waivedById: recordedById,
        },
      })
      waivedAmount += w.amount
    }

    // Activity trail: who collected the fee. One row summarising the whole
    // payment (it may span several months/receipts). Logged in-tx so it commits
    // with the payment. Skipped for system writes with no actor.
    const collected = rows.reduce((sum, r) => sum + Number(r.amount), 0)
    if (recordedById && rows.length > 0) {
      await recordAudit(tx, {
        instituteId,
        actorId: recordedById,
        action: AUDIT_ACTIONS.FEE_PAYMENT_RECORD,
        entityType: "FeePayment",
        entityId: rows[0].id,
        metadata: {
          studentId: student.id,
          studentName: student.fullName,
          amount: collected,
          receiptNo: rows[0].receiptNo,
          months: rows.length,
        },
      })
    }

    return { rows, waivedAmount }
  })

  return {
    payments: created.rows.map(toPaymentItem),
    waivedAmount: created.waivedAmount,
  }
}

const REVERSAL_ERRORS: Record<
  Exclude<ReturnType<typeof resolveReversal>, { ok: true }>["reason"],
  string
> = {
  ALREADY_REVERSED: "This payment has already been fully reversed.",
  INVALID_AMOUNT: "Enter a reversal amount greater than zero.",
  EXCEEDS_REMAINING: "That's more than the amount left to reverse on this payment.",
}

/**
 * Reverses a payment, fully or partially, WITHOUT deleting it. Writes a linked
 * FeePayment row with a negative amount (a credit note) for the same period, so
 * balances net out automatically while the original receipt and audit trail stay
 * intact. Reversals can stack up to the original amount; a reversal row itself
 * can't be reversed. Returns the new reversal entry and the refreshed original.
 */
export async function reversePayment(
  instituteId: string,
  recordedById: string | null,
  input: ReverseFeeInput
): Promise<{ reversal: PaymentItem; original: PaymentItem }> {
  return prisma.$transaction(async (tx) => {
    // Lock the original row up front so concurrent reversals of the same
    // payment serialize. Without it both could read the same reversed-so-far,
    // both pass validation, and over-reverse past the original amount — there's
    // no unique constraint to backstop this path.
    await tx.$queryRaw`SELECT id FROM public."FeePayment" WHERE id = ${input.paymentId} FOR UPDATE`

    const original = await tx.feePayment.findFirst({
      where: { id: input.paymentId, instituteId },
      include: { recordedBy: { select: { name: true } } },
    })
    if (!original) throw new NotFoundError("Payment not found.")
    if (original.reversalOfId != null) {
      throw new ValidationError("That entry is a reversal and can't be reversed.")
    }
    const originalAmount = Number(original.amount)
    if (originalAmount <= 0) {
      throw new ValidationError("Only a payment can be reversed.")
    }

    // Reversal rows are negative, so reversed-so-far is the negation of their sum.
    const reversedAgg = await tx.feePayment.aggregate({
      where: { reversalOfId: original.id },
      _sum: { amount: true },
    })
    const reversedSoFar = -Number(reversedAgg._sum.amount ?? 0)

    const plan = resolveReversal(originalAmount, reversedSoFar, input.amount)
    if (!plan.ok) throw new ValidationError(REVERSAL_ERRORS[plan.reason])

    const row = await tx.feePayment.create({
      data: {
        instituteId,
        studentId: original.studentId,
        amount: -plan.amount,
        periodMonth: original.periodMonth,
        periodYear: original.periodYear,
        method: original.method,
        paidAt: nowDate(),
        receiptNo: null,
        note: input.reason,
        recordedById,
        reversalOfId: original.id,
      },
      include: { recordedBy: { select: { name: true } } },
    })

    await recordAudit(tx, {
      instituteId,
      actorId: recordedById,
      action: AUDIT_ACTIONS.FEE_PAYMENT_REVERSE,
      entityType: "FeePayment",
      entityId: original.id,
      metadata: {
        amount: plan.amount,
        receiptNo: original.receiptNo,
        studentId: original.studentId,
        month: original.periodMonth,
        year: original.periodYear,
        reason: input.reason ?? null,
      },
    })

    return {
      reversal: toPaymentItem(row),
      original: toPaymentItem(original, reversedSoFar + plan.amount),
    }
  })
}

const WAIVER_REVERSAL_ERRORS: Record<
  Exclude<ReturnType<typeof resolveReversal>, { ok: true }>["reason"],
  string
> = {
  ALREADY_REVERSED: "This waiver has already been reversed.",
  INVALID_AMOUNT: "There's nothing left to reverse on this waiver.",
  EXCEEDS_REMAINING: "That's more than the amount left to reverse on this waiver.",
}

/**
 * Reverses a single waiver row in full, WITHOUT deleting it — writes a linked
 * FeeWaiver row with a negative amount for the same period, so waived totals net
 * out automatically while the concession history stays intact. Gated on fee:waive
 * (whoever may grant a concession may undo it; no separate reverse permission).
 */
export async function reverseWaiver(
  instituteId: string,
  waivedById: string | null,
  input: ReverseWaiverInput
): Promise<{ reversal: WaiverItem; original: WaiverItem }> {
  return prisma.$transaction(async (tx) => {
    // Lock the original so concurrent reversals of the same waiver serialize.
    await tx.$queryRaw`SELECT id FROM public."FeeWaiver" WHERE id = ${input.waiverId} FOR UPDATE`

    const original = await tx.feeWaiver.findFirst({
      where: { id: input.waiverId, instituteId },
      include: { waivedBy: { select: { name: true } } },
    })
    if (!original) throw new NotFoundError("Waiver not found.")
    if (original.reversalOfId != null) {
      throw new ValidationError("That entry is a reversal and can't be reversed.")
    }
    const originalAmount = Number(original.amount)
    if (originalAmount <= 0) {
      throw new ValidationError("Only a waiver can be reversed.")
    }

    // Reversal rows are negative, so reversed-so-far is the negation of their sum.
    const reversedAgg = await tx.feeWaiver.aggregate({
      where: { reversalOfId: original.id },
      _sum: { amount: true },
    })
    const reversedSoFar = -Number(reversedAgg._sum.amount ?? 0)

    // A waiver row is reversed in full (one row per month), so no partial amount.
    const plan = resolveReversal(originalAmount, reversedSoFar)
    if (!plan.ok) throw new ValidationError(WAIVER_REVERSAL_ERRORS[plan.reason])

    const row = await tx.feeWaiver.create({
      data: {
        instituteId,
        studentId: original.studentId,
        amount: -plan.amount,
        periodMonth: original.periodMonth,
        periodYear: original.periodYear,
        reason: input.reason ?? WAIVER_REASON_REVERSED,
        waivedById,
        reversalOfId: original.id,
      },
      include: { waivedBy: { select: { name: true } } },
    })

    await recordAudit(tx, {
      instituteId,
      actorId: waivedById,
      action: AUDIT_ACTIONS.FEE_WAIVER_REVERSE,
      entityType: "FeeWaiver",
      entityId: original.id,
      metadata: {
        amount: plan.amount,
        studentId: original.studentId,
        month: original.periodMonth,
        year: original.periodYear,
        reason: input.reason ?? null,
      },
    })

    return {
      reversal: toWaiverItem(row),
      original: toWaiverItem(original, reversedSoFar + plan.amount),
    }
  })
}

/**
 * Records a fee concession and distributes it across outstanding months, oldest
 * first (admission → now) — so "waive the full due" can clear back-dues spanning
 * several months in one action. One FeeWaiver row is written per month it touches.
 * A waiver reduces the amount due — it is NOT cash, so it never counts towards
 * collected totals. Rejects an amount larger than the student's total outstanding.
 */
export async function recordWaiver(
  instituteId: string,
  waivedById: string | null,
  input: WaiveFeeInput
): Promise<{ waivers: WaiverItem[]; total: number }> {
  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: input.studentId, instituteId },
      select: { id: true, fullName: true, monthlyFee: true, admissionDate: true },
    })
    if (!student) throw new NotFoundError("Student not found.")

    const fee = Number(student.monthlyFee)
    const now = appYearMonth(nowDate())

    // What's already settled per month, so we only ever waive the unmet due.
    const [paidGroups, waiverGroups] = await Promise.all([
      tx.feePayment.groupBy({
        by: ["periodYear", "periodMonth"],
        where: { instituteId, studentId: student.id, periodYear: { not: null } },
        _sum: { amount: true },
      }),
      tx.feeWaiver.groupBy({
        by: ["periodYear", "periodMonth"],
        where: { instituteId, studentId: student.id },
        _sum: { amount: true },
      }),
    ])
    const key = (y: number, m: number) => `${y}-${m}`
    const paid = new Map<string, number>()
    for (const g of paidGroups) {
      if (g.periodYear == null || g.periodMonth == null) continue
      paid.set(key(g.periodYear, g.periodMonth), Number(g._sum.amount ?? 0))
    }
    const waived = new Map<string, number>()
    for (const g of waiverGroups) {
      waived.set(key(g.periodYear, g.periodMonth), Number(g._sum.amount ?? 0))
    }

    const plan = planWaiver({
      fee,
      paid,
      waived,
      admission: appYearMonth(student.admissionDate),
      now,
      amount: input.amount,
    })
    // Can't waive more than is actually owed.
    if (plan.unallocated > 0 || plan.allocations.length === 0) {
      throw new ValidationError(
        "That's more than this student's total outstanding."
      )
    }

    const reason = input.reason ?? WAIVER_REASON_DEFAULT
    const rows: WaiverWithGranter[] = []
    for (const a of plan.allocations) {
      const row = await tx.feeWaiver.create({
        data: {
          instituteId,
          studentId: student.id,
          amount: a.amount,
          periodMonth: a.month,
          periodYear: a.year,
          reason,
          waivedById,
        },
        include: { waivedBy: { select: { name: true } } },
      })
      rows.push(row)
    }

    await recordAudit(tx, {
      instituteId,
      actorId: waivedById,
      action: AUDIT_ACTIONS.FEE_WAIVE,
      entityType: "Student",
      entityId: student.id,
      metadata: {
        amount: rows.reduce((sum, r) => sum + Number(r.amount), 0),
        months: rows.length,
        reason,
      },
    })
    return rows
  })

  return {
    waivers: created.map(toWaiverItem),
    total: created.reduce((sum, w) => sum + Number(w.amount), 0),
  }
}

export async function getReceipt(
  instituteId: string,
  paymentId: string
): Promise<ReceiptData> {
  const p = await prisma.feePayment.findFirst({
    where: { id: paymentId, instituteId },
    include: {
      student: {
        select: {
          fullName: true,
          serialNo: true,
          contactNumber: true,
          class: { select: { name: true, section: true } },
        },
      },
      institute: {
        select: { name: true, addressLine: true, city: true, phone: true, email: true },
      },
      recordedBy: { select: { name: true } },
    },
  })
  // Reversal rows carry no receipt number — they have no receipt to print.
  if (!p || p.receiptNo == null || p.reversalOfId != null) {
    throw new NotFoundError("Receipt not found.")
  }

  return {
    receiptNo: p.receiptNo,
    amount: Number(p.amount),
    periodMonth: p.periodMonth,
    periodYear: p.periodYear,
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    note: p.note,
    recordedBy: p.recordedBy?.name ?? null,
    student: {
      fullName: p.student.fullName,
      serialNo: p.student.serialNo,
      className: p.student.class?.name ?? null,
      classSection: p.student.class?.section ?? null,
      contactNumber: p.student.contactNumber,
    },
    institute: {
      name: p.institute.name,
      addressLine: p.institute.addressLine,
      city: p.institute.city,
      phone: p.institute.phone,
      email: p.institute.email,
    },
  }
}

/**
 * Dues-covered total per fee month (for the month switcher pills). Caps each
 * student's contribution at their fee so it stays consistent with the per-month
 * summary. Optionally scoped to one class.
 */
export async function feeMonthlyOverview(
  instituteId: string,
  classId?: string
): Promise<FeeMonthlyOverview> {
  const students = await prisma.student.findMany({
    where: {
      instituteId,
      archivedAt: null,
      status: "ACTIVE",
      ...(classId ? { classId } : {}),
    },
    select: { id: true, monthlyFee: true, admissionDate: true },
  })
  const feeMap = new Map(students.map((s) => [s.id, Number(s.monthlyFee)]))
  const ids = students.map((s) => s.id)

  const [groups, waiverGroups] = ids.length
    ? await Promise.all([
        prisma.feePayment.groupBy({
          by: ["studentId", "periodYear", "periodMonth"],
          where: { instituteId, studentId: { in: ids }, periodYear: { not: null } },
          _sum: { amount: true },
        }),
        prisma.feeWaiver.groupBy({
          by: ["studentId", "periodYear", "periodMonth"],
          where: { instituteId, studentId: { in: ids } },
          _sum: { amount: true },
        }),
      ])
    : [[], []]

  // Per student-month waived amount, so net due = fee - waived everywhere.
  const wKey = (sid: string, y: number, m: number) => `${sid}:${y}-${m}`
  const waivedMap = new Map<string, number>()
  for (const g of waiverGroups) {
    waivedMap.set(wKey(g.studentId, g.periodYear, g.periodMonth), Number(g._sum.amount ?? 0))
  }

  const collectedByMonth: Record<string, number> = {}
  for (const g of groups) {
    if (g.periodYear == null || g.periodMonth == null) continue
    const fee = feeMap.get(g.studentId) ?? 0
    const waived = waivedMap.get(wKey(g.studentId, g.periodYear, g.periodMonth)) ?? 0
    const netDue = Math.max(0, fee - waived)
    const cover = Math.min(Number(g._sum.amount ?? 0), netDue)
    const key = `${g.periodYear}-${g.periodMonth}`
    collectedByMonth[key] = (collectedByMonth[key] ?? 0) + cover
  }

  // A window of months around now. Expected for each month only counts students
  // already enrolled by then (admissionDate before the next month begins), and is
  // net of waivers — a waived month lowers what's expected to be collected in cash.
  const nowYM = appYearMonth(nowDate())
  const byMonth: Record<string, { collected: number; expected: number }> = {}
  for (let off = -5; off <= 1; off++) {
    const { year: y, month: m } = appYearMonth(
      appMonthStartUtc(nowYM.year, nowYM.month + off)
    )
    const firstOfNext = appMonthStartUtc(y, m + 1)
    const key = `${y}-${m}`
    const expected = students
      .filter((s) => s.admissionDate < firstOfNext)
      .reduce((sum, s) => {
        const waived = waivedMap.get(wKey(s.id, y, m)) ?? 0
        return sum + Math.max(0, Number(s.monthlyFee) - waived)
      }, 0)
    byMonth[key] = { collected: collectedByMonth[key] ?? 0, expected }
  }
  return { byMonth }
}

/**
 * Month headline numbers (collected / expected / outstanding + paid vs pending
 * counts) for the selected month and class. Computed over every matching student
 * with the same deriveMonth math as the list, so the dashboard totals stay exact
 * however the list is paged. Class-scoped but not affected by text search.
 */
export async function feeMonthSummary(
  instituteId: string,
  opts: { periodMonth?: number; periodYear?: number; classId?: string }
): Promise<FeeSummary> {
  const rows = await loadMonthFeeRows(instituteId, opts)

  let expected = 0
  let collected = 0
  let outstanding = 0
  let waived = 0
  let paidCount = 0
  for (const r of rows) {
    const netDue = Math.max(0, r.monthlyFee - r.waivedThisMonth)
    expected += netDue
    collected += Math.min(r.paidThisMonth, netDue)
    outstanding += r.pendingThisMonth
    waived += r.waivedThisMonth
    if (r.pendingThisMonth <= 0) paidCount += 1
  }

  return {
    collectedThisMonth: collected,
    expectedThisMonth: expected,
    pendingThisMonth: outstanding,
    waivedThisMonth: waived,
    paidCount,
    pendingCount: rows.length - paidCount,
    totalStudents: rows.length,
  }
}
