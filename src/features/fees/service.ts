import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { appYearMonth, appMonthStartUtc, nowDate } from "@/lib/date-helper"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { recordAudit, AUDIT_ACTIONS } from "@/features/audit/service"
import { deriveMonth, effectiveFee, resolveReversal } from "@/features/fees/logic"
import { ensureChargesForStudent } from "@/features/enrollment/service"
import { installmentStatus } from "@/features/installments/logic"
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

// Two-decimal rounding so money comparisons don't trip on float noise.
const round2 = (n: number) => Math.round(n * 100) / 100

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
      contactNumber: true,
      billingMode: true,
      class: { select: { name: true, section: true } },
    },
  })

  const ids = students.map((s) => s.id)
  const [grouped, waiverGroups, installmentGroups] = await Promise.all([
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
    // Installment students' expected-this-month = their INSTALLMENT charges due this
    // period (not effectiveFee). Period-keyed, so future installments don't leak in.
    prisma.feeCharge.groupBy({
      by: ["studentId"],
      where: { instituteId, type: "INSTALLMENT", periodMonth: month, periodYear: year, studentId: { in: ids } },
      _sum: { amount: true },
    }),
  ])
  const paidMap = new Map(grouped.map((g) => [g.studentId, Number(g._sum.amount ?? 0)]))
  const waivedMap = new Map(
    waiverGroups.map((g) => [g.studentId, Number(g._sum.amount ?? 0)])
  )
  const installmentMap = new Map(
    installmentGroups.map((g) => [g.studentId, Number(g._sum.amount ?? 0)])
  )

  // Per-month tuition fee per student = sum of their active enrolments' effective
  // fee that had started by this month (matches how charges are generated).
  const enrollments = ids.length
    ? await prisma.enrollment.findMany({
        where: {
          instituteId,
          studentId: { in: ids },
          status: "ACTIVE",
          startDate: { lt: appMonthStartUtc(year, month + 1) },
          // Only MONTHLY students accrue an effectiveFee-based expected; INSTALLMENT
          // students' expected comes from installmentMap above.
          student: { billingMode: "MONTHLY" },
        },
        select: {
          studentId: true,
          feeOverride: true,
          discountPercent: true,
          course: { select: { monthlyFee: true } },
        },
      })
    : []
  const feeMap = new Map<string, number>()
  for (const e of enrollments) {
    const fee = effectiveFee(
      Number(e.course.monthlyFee),
      e.feeOverride != null ? Number(e.feeOverride) : null,
      e.discountPercent != null ? Number(e.discountPercent) : null
    )
    feeMap.set(e.studentId, (feeMap.get(e.studentId) ?? 0) + fee)
  }

  return students.map((s) => {
    // Expected-this-month: INSTALLMENT → installments due this period; MONTHLY →
    // Σ active effectiveFee (unchanged). Both flow through deriveMonth identically.
    const monthlyFee =
      s.billingMode === "INSTALLMENT" ? (installmentMap.get(s.id) ?? 0) : (feeMap.get(s.id) ?? 0)
    const paid = paidMap.get(s.id) ?? 0
    const waived = waivedMap.get(s.id) ?? 0
    const { pending, advance, status } = deriveMonth(monthlyFee, paid, waived)
    return {
      studentId: s.id,
      serialNo: s.serialNo,
      fullName: s.fullName,
      className: s.class?.name ?? null,
      classSection: s.class?.section ?? null,
      billingMode: s.billingMode,
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
      admissionDate: true,
      billingMode: true,
      class: { select: { name: true, section: true } },
    },
  })
  if (!student) throw new NotFoundError("Student not found.")

  // Keep the charge ledger current, then read every figure from it.
  await ensureChargesForStudent(instituteId, studentId)

  const { month, year } = currentPeriod()
  const nowKey = `${year}-${month}`
  const [charges, payments, waivers] = await Promise.all([
    prisma.feeCharge.findMany({
      where: { studentId, instituteId },
      select: { id: true, type: true, label: true, periodMonth: true, periodYear: true, amount: true, dueDate: true },
    }),
    prisma.feePayment.findMany({
      where: { studentId, instituteId },
      orderBy: { paidAt: "desc" },
      include: { recordedBy: { select: { name: true } } },
    }),
    prisma.feeWaiver.findMany({
      where: { studentId, instituteId },
      orderBy: { createdAt: "desc" },
      include: { waivedBy: { select: { name: true } } },
    }),
  ])

  // The per-month tuition fee (summed across enrolments) comes from the TUITION
  // charges — NOT student.monthlyFee. One-time charges are a separate bucket.
  const feeByPeriod = new Map<string, number>()
  const oneTime: { id: string; label: string; amount: number }[] = []
  const installmentCharges: { id: string; label: string | null; dueDate: Date; amount: number }[] = []
  // Periods carrying an INSTALLMENT charge — only these get the future-period gate
  // below. A future TUITION period (a reversed monthly prepayment) must still count,
  // so a monthly student's outstanding stays byte-identical.
  const installmentPeriods = new Set<string>()
  for (const c of charges) {
    if ((c.type === "TUITION" || c.type === "INSTALLMENT") && c.periodYear != null && c.periodMonth != null) {
      const k = `${c.periodYear}-${c.periodMonth}`
      feeByPeriod.set(k, (feeByPeriod.get(k) ?? 0) + Number(c.amount))
      if (c.type === "INSTALLMENT") {
        installmentPeriods.add(k)
        installmentCharges.push({ id: c.id, label: c.label, dueDate: c.dueDate, amount: Number(c.amount) })
      }
    } else {
      oneTime.push({ id: c.id, label: c.label ?? "One-time fee", amount: Number(c.amount) })
    }
  }

  // Paid/waived per period (tuition) and per charge (one-time). Reversal rows are
  // negative, so these sums are already net.
  const paidByPeriod = new Map<string, number>()
  const paidByCharge = new Map<string, number>()
  for (const p of payments) {
    if (p.periodYear != null && p.periodMonth != null) {
      const k = `${p.periodYear}-${p.periodMonth}`
      paidByPeriod.set(k, (paidByPeriod.get(k) ?? 0) + Number(p.amount))
    }
    if (p.chargeId) paidByCharge.set(p.chargeId, (paidByCharge.get(p.chargeId) ?? 0) + Number(p.amount))
  }
  const waivedByPeriod = new Map<string, number>()
  const waivedByCharge = new Map<string, number>()
  for (const w of waivers) {
    const k = `${w.periodYear}-${w.periodMonth}`
    waivedByPeriod.set(k, (waivedByPeriod.get(k) ?? 0) + Number(w.amount))
    if (w.chargeId) waivedByCharge.set(w.chargeId, (waivedByCharge.get(w.chargeId) ?? 0) + Number(w.amount))
  }

  // How much of each original payment/waiver has been reversed (negative rows).
  const reversedByPayment = new Map<string, number>()
  for (const p of payments) {
    if (p.reversalOfId == null) continue
    reversedByPayment.set(p.reversalOfId, (reversedByPayment.get(p.reversalOfId) ?? 0) - Number(p.amount))
  }
  const reversedByWaiver = new Map<string, number>()
  for (const w of waivers) {
    if (w.reversalOfId == null) continue
    reversedByWaiver.set(w.reversalOfId, (reversedByWaiver.get(w.reversalOfId) ?? 0) - Number(w.amount))
  }

  const monthlyFee = feeByPeriod.get(nowKey) ?? 0
  const paidThisMonth = paidByPeriod.get(nowKey) ?? 0
  const waivedThisMonth = waivedByPeriod.get(nowKey) ?? 0

  // For INSTALLMENT students, paying a scheduled installment early lands on a
  // future-period charge — the normal flow, not a credit. Don't treat it as advance
  // (else they'd read ADVANCE forever). Monthly prepayment still counts as advance.
  const futurePaid =
    student.billingMode === "INSTALLMENT"
      ? 0
      : payments.reduce((sum, p) => {
          const isFuture =
            p.periodYear != null &&
            (p.periodYear > year || (p.periodYear === year && (p.periodMonth ?? 0) > month))
          return isFuture ? sum + Number(p.amount) : sum
        }, 0)
  const month0 = deriveMonth(monthlyFee, paidThisMonth, waivedThisMonth)
  const advance = month0.advance + futurePaid
  const status: FeeStatus = advance > 0 ? "ADVANCE" : month0.status

  // Lifetime outstanding = every tuition month's unmet due (capped per month) plus
  // every one-time charge's unmet due. Caps stop an overpaid item cancelling another.
  // A not-yet-due INSTALLMENT period isn't outstanding (installments are minted
  // upfront). TUITION only materializes the future via a (since-reversed) monthly
  // prepayment, which MUST still count — so the gate is scoped to installment periods
  // and a monthly student's outstanding stays byte-identical.
  let totalOutstanding = 0
  for (const [k, fee] of feeByPeriod) {
    if (installmentPeriods.has(k)) {
      const [py, pm] = k.split("-").map(Number)
      if (py > year || (py === year && pm > month)) continue
    }
    totalOutstanding += Math.max(0, fee - (waivedByPeriod.get(k) ?? 0) - (paidByPeriod.get(k) ?? 0))
  }
  for (const c of oneTime) {
    totalOutstanding += Math.max(0, c.amount - (waivedByCharge.get(c.id) ?? 0) - (paidByCharge.get(c.id) ?? 0))
  }

  const adm = appYearMonth(student.admissionDate)

  return {
    studentId: student.id,
    serialNo: student.serialNo,
    fullName: student.fullName,
    className: student.class?.name ?? null,
    classSection: student.class?.section ?? null,
    guardianName: student.guardianName,
    contactNumber: student.contactNumber,
    monthlyFee,
    totalPaid: payments.reduce((s, p) => s + Number(p.amount), 0),
    // Total billed across every charge — the student's total course/plan fee.
    totalCharged: round2(charges.reduce((s, c) => s + Number(c.amount), 0)),
    totalWaived: waivers.reduce((s, w) => s + Number(w.amount), 0),
    paidThisMonth,
    waivedThisMonth,
    pendingThisMonth: month0.pending,
    totalOutstanding,
    advance,
    status,
    payments: payments.map((p) => toPaymentItem(p, reversedByPayment.get(p.id) ?? 0)),
    waivers: waivers.map((w) => toWaiverItem(w, reversedByWaiver.get(w.id) ?? 0)),
    admission: { year: adm.year, month: adm.month },
    billingMode: student.billingMode,
    paidByMonth: Object.fromEntries(paidByPeriod),
    waivedByMonth: Object.fromEntries(waivedByPeriod),
    expectedByMonth: Object.fromEntries(feeByPeriod),
    installments: installmentCharges
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .map((c, i) => {
        const paid = round2(paidByCharge.get(c.id) ?? 0)
        const waived = round2(waivedByCharge.get(c.id) ?? 0)
        const due = appYearMonth(c.dueDate)
        return {
          id: c.id,
          seq: i + 1,
          label: c.label,
          dueDate: c.dueDate.toISOString(),
          amount: c.amount,
          paid,
          waived,
          outstanding: Math.max(0, round2(c.amount - paid - waived)),
          status: installmentStatus({
            amount: c.amount,
            paid,
            waived,
            dueYear: due.year,
            dueMonth: due.month,
            nowYear: year,
            nowMonth: month,
          }),
        }
      }),
    oneTimeCharges: oneTime.map((c) => {
      const paid = paidByCharge.get(c.id) ?? 0
      const waived = waivedByCharge.get(c.id) ?? 0
      return {
        id: c.id,
        label: c.label,
        amount: c.amount,
        paid,
        outstanding: Math.max(0, round2(c.amount - waived - paid)),
      }
    }),
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
  // Top up tuition charges to now first, so the cash has real charges to land on.
  await ensureChargesForStudent(instituteId, input.studentId)

  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: input.studentId, instituteId },
      select: { id: true, fullName: true, billingMode: true },
    })
    if (!student) throw new NotFoundError("Student not found.")

    // Existing charges + what's already settled on each (net of reversals).
    const charges = await tx.feeCharge.findMany({
      where: { instituteId, studentId: student.id },
      select: {
        id: true,
        type: true,
        enrollmentId: true,
        periodMonth: true,
        periodYear: true,
        amount: true,
      },
      orderBy: { dueDate: "asc" },
    })
    const [paidGroups, waiverGroups] = await Promise.all([
      tx.feePayment.groupBy({
        by: ["chargeId"],
        where: { instituteId, studentId: student.id, chargeId: { not: null } },
        _sum: { amount: true },
      }),
      tx.feeWaiver.groupBy({
        by: ["chargeId"],
        where: { instituteId, studentId: student.id, chargeId: { not: null } },
        _sum: { amount: true },
      }),
    ])
    const paidByCharge = new Map<string, number>()
    for (const g of paidGroups) if (g.chargeId) paidByCharge.set(g.chargeId, Number(g._sum.amount ?? 0))
    const waivedByCharge = new Map<string, number>()
    for (const g of waiverGroups) if (g.chargeId) waivedByCharge.set(g.chargeId, Number(g._sum.amount ?? 0))
    const dueOf = (c: { id: string; amount: Prisma.Decimal }) =>
      round2(Number(c.amount) - (paidByCharge.get(c.id) ?? 0) - (waivedByCharge.get(c.id) ?? 0))

    type ChargeRef = {
      id: string
      // Null for INSTALLMENT charges (student-scoped). FeePayment.enrollmentId is
      // also nullable, so a null flows through to the payment row fine.
      enrollmentId: string | null
      periodMonth: number | null
      periodYear: number | null
    }
    const allocs: { charge: ChargeRef; amount: number }[] = []
    let remaining = round2(input.amount)

    // 1) Fill existing unpaid charges, oldest due-date first.
    for (const c of charges) {
      if (remaining <= 0) break
      const due = dueOf(c)
      if (due <= 0) continue
      const take = Math.min(remaining, due)
      allocs.push({ charge: c, amount: round2(take) })
      remaining = round2(remaining - take)
    }

    // 2) Prepay forward: mint future TUITION charges for active enrolments and keep
    //    allocating, oldest month first, until the cash is spent (bounded). Skipped
    //    for INSTALLMENT students — their whole schedule is already materialized, so
    //    step 1 above prepays future installments directly; any true leftover becomes
    //    an advance credit below (R8). Minting TUITION for them would be phantom.
    if (remaining > 0 && student.billingMode !== "INSTALLMENT") {
      const active = await tx.enrollment.findMany({
        where: { instituteId, studentId: student.id, status: "ACTIVE" },
        include: { course: { select: { monthlyFee: true } } },
      })
      const now = appYearMonth(nowDate())
      // Latest existing TUITION period per enrolment, so we mint AFTER it and never
      // collide with an already-minted future charge (the @@unique on period) — which
      // would otherwise 500 the whole payment on a second prepayment.
      const latestTuition = new Map<string, { y: number; m: number }>()
      for (const c of charges) {
        if (c.type !== "TUITION" || c.enrollmentId == null || c.periodYear == null || c.periodMonth == null) continue
        const cur = latestTuition.get(c.enrollmentId)
        if (!cur || c.periodYear > cur.y || (c.periodYear === cur.y && c.periodMonth > cur.m)) {
          latestTuition.set(c.enrollmentId, { y: c.periodYear, m: c.periodMonth })
        }
      }
      const cursor = new Map<string, { y: number; m: number; fee: number }>()
      for (const e of active) {
        const fee = effectiveFee(
          Number(e.course.monthlyFee),
          e.feeOverride != null ? Number(e.feeOverride) : null,
          e.discountPercent != null ? Number(e.discountPercent) : null
        )
        if (fee <= 0) continue
        // Start one month past the later of "now" and the newest existing charge.
        let baseY = now.year
        let baseM = now.month
        const latest = latestTuition.get(e.id)
        if (latest && (latest.y > baseY || (latest.y === baseY && latest.m > baseM))) {
          baseY = latest.y
          baseM = latest.m
        }
        let ny = baseY
        let nm = baseM + 1
        if (nm > 12) { nm = 1; ny += 1 }
        cursor.set(e.id, { y: ny, m: nm, fee })
      }
      let guard = 0
      while (remaining > 0 && cursor.size > 0 && guard < 1200) {
        guard += 1
        let pickId: string | null = null
        let pick: { y: number; m: number; fee: number } | null = null
        for (const [eid, c] of cursor) {
          if (!pick || c.y < pick.y || (c.y === pick.y && c.m < pick.m)) {
            pick = c
            pickId = eid
          }
        }
        if (!pickId || !pick) break
        const charge = await tx.feeCharge.create({
          data: {
            instituteId,
            enrollmentId: pickId,
            studentId: student.id,
            type: "TUITION",
            periodMonth: pick.m,
            periodYear: pick.y,
            amount: pick.fee,
            dueDate: appMonthStartUtc(pick.y, pick.m),
          },
          select: { id: true, enrollmentId: true, periodMonth: true, periodYear: true },
        })
        const take = Math.min(remaining, pick.fee)
        allocs.push({ charge, amount: round2(take) })
        remaining = round2(remaining - take)
        let ny = pick.y
        let nm = pick.m + 1
        if (nm > 12) { nm = 1; ny += 1 }
        cursor.set(pickId, { y: ny, m: nm, fee: pick.fee })
      }
    }

    // Installment students: cash beyond their materialized schedule has nothing more
    // to land on (no future months are minted for them), so receipt the leftover as a
    // current-period advance credit — every rupee is accounted for (R8). Monthly
    // students keep minting future months above, so they rarely reach here.
    const creditAmount = student.billingMode === "INSTALLMENT" ? round2(remaining) : 0
    if (creditAmount > 0) remaining = round2(remaining - creditAmount)

    // Persist: one FeePayment (+ sequential receipt) per allocation, linked to its
    // charge + enrolment. Reversal rows (receiptNo NULL) are skipped for the seq.
    const last = await tx.feePayment.findFirst({
      where: { instituteId, receiptNo: { not: null } },
      orderBy: { receiptNo: "desc" },
      select: { receiptNo: true },
    })
    let receiptNo = (last?.receiptNo ?? 0) + 1
    const rows: PaymentWithRecorder[] = []
    for (const a of allocs) {
      const row = await tx.feePayment.create({
        data: {
          instituteId,
          studentId: student.id,
          enrollmentId: a.charge.enrollmentId,
          chargeId: a.charge.id,
          amount: a.amount,
          periodMonth: a.charge.periodMonth,
          periodYear: a.charge.periodYear,
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

    // R8: receipt any installment overpayment as a current-period advance credit.
    if (creditAmount > 0) {
      const now = appYearMonth(nowDate())
      const credit = await tx.feePayment.create({
        data: {
          instituteId,
          studentId: student.id,
          enrollmentId: null,
          chargeId: null,
          amount: creditAmount,
          periodMonth: now.month,
          periodYear: now.year,
          method: input.method,
          paidAt: input.paidAt,
          receiptNo: receiptNo++,
          note: input.note ?? null,
          recordedById,
        },
        include: { recordedBy: { select: { name: true } } },
      })
      rows.push(credit)
    }

    // waiveRemaining: clear whatever still owes on TUITION/INSTALLMENT charges after
    // the cash (one-time charges can't be waived — a waiver row requires a period).
    let waivedAmount = 0
    if (input.waiveRemaining) {
      const { month: wMonth, year: wYear } = currentPeriod()
      const allocByCharge = new Map<string, number>()
      for (const a of allocs) allocByCharge.set(a.charge.id, (allocByCharge.get(a.charge.id) ?? 0) + a.amount)
      for (const c of charges) {
        if ((c.type !== "TUITION" && c.type !== "INSTALLMENT") || c.periodMonth == null || c.periodYear == null) continue
        // Don't waive a not-yet-due future INSTALLMENT when "settling" a payment.
        // Scoped to installments so a future TUITION period (a reversed monthly
        // prepayment) stays waivable exactly as before — monthly path unchanged.
        if (
          c.type === "INSTALLMENT" &&
          (c.periodYear > wYear || (c.periodYear === wYear && c.periodMonth > wMonth))
        )
          continue
        const due = round2(dueOf(c) - (allocByCharge.get(c.id) ?? 0))
        if (due > 0) {
          await tx.feeWaiver.create({
            data: {
              instituteId,
              studentId: student.id,
              enrollmentId: c.enrollmentId,
              chargeId: c.id,
              amount: due,
              periodMonth: c.periodMonth,
              periodYear: c.periodYear,
              reason: WAIVER_REASON_SETTLE,
              waivedById: recordedById,
            },
          })
          waivedAmount += due
        }
      }
    }

    // Activity trail: one row summarising the whole payment. Logged in-tx.
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
          charges: rows.length,
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
        // Carry the charge + enrolment link so per-charge and per-enrolment netting
        // (one-time charges, the enrolment ledger) see this credit note — without it
        // a reversed one-time charge stays counted as paid.
        enrollmentId: original.enrollmentId,
        chargeId: original.chargeId,
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
        // Carry the charge + enrolment link so per-charge netting sees this reversal.
        enrollmentId: original.enrollmentId,
        chargeId: original.chargeId,
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
  await ensureChargesForStudent(instituteId, input.studentId)

  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: input.studentId, instituteId },
      select: { id: true, fullName: true },
    })
    if (!student) throw new NotFoundError("Student not found.")

    // Outstanding per TUITION charge, oldest-first — a waiver only clears real dues,
    // never prepays the future, and can't touch one-time charges (no period).
    const charges = await tx.feeCharge.findMany({
      where: { instituteId, studentId: student.id, type: { in: ["TUITION", "INSTALLMENT"] } },
      select: { id: true, type: true, enrollmentId: true, periodMonth: true, periodYear: true, amount: true },
      orderBy: { dueDate: "asc" },
    })
    const { month: nowMonth, year: nowYear } = currentPeriod()
    const [paidGroups, waiverGroups] = await Promise.all([
      tx.feePayment.groupBy({
        by: ["chargeId"],
        where: { instituteId, studentId: student.id, chargeId: { not: null } },
        _sum: { amount: true },
      }),
      tx.feeWaiver.groupBy({
        by: ["chargeId"],
        where: { instituteId, studentId: student.id, chargeId: { not: null } },
        _sum: { amount: true },
      }),
    ])
    const paidByCharge = new Map<string, number>()
    for (const g of paidGroups) if (g.chargeId) paidByCharge.set(g.chargeId, Number(g._sum.amount ?? 0))
    const waivedByCharge = new Map<string, number>()
    for (const g of waiverGroups) if (g.chargeId) waivedByCharge.set(g.chargeId, Number(g._sum.amount ?? 0))

    const reason = input.reason ?? WAIVER_REASON_DEFAULT
    let remaining = round2(input.amount)
    const rows: WaiverWithGranter[] = []
    for (const c of charges) {
      if (remaining <= 0) break
      if (c.periodMonth == null || c.periodYear == null) continue
      // A waiver never clears a not-yet-due future INSTALLMENT. Scoped to installments
      // so a future TUITION period (a reversed monthly prepayment) stays waivable
      // exactly as before — the monthly path is unchanged.
      if (
        c.type === "INSTALLMENT" &&
        (c.periodYear > nowYear || (c.periodYear === nowYear && c.periodMonth > nowMonth))
      )
        continue
      const due = round2(Number(c.amount) - (paidByCharge.get(c.id) ?? 0) - (waivedByCharge.get(c.id) ?? 0))
      if (due <= 0) continue
      const take = Math.min(remaining, due)
      const row = await tx.feeWaiver.create({
        data: {
          instituteId,
          studentId: student.id,
          enrollmentId: c.enrollmentId,
          chargeId: c.id,
          amount: round2(take),
          periodMonth: c.periodMonth,
          periodYear: c.periodYear,
          reason,
          waivedById,
        },
        include: { waivedBy: { select: { name: true } } },
      })
      rows.push(row)
      remaining = round2(remaining - take)
    }
    // Can't waive more than is actually owed.
    if (remaining > 0 || rows.length === 0) {
      throw new ValidationError("That's more than this student's total outstanding.")
    }

    await recordAudit(tx, {
      instituteId,
      actorId: waivedById,
      action: AUDIT_ACTIONS.FEE_WAIVE,
      entityType: "Student",
      entityId: student.id,
      metadata: {
        amount: rows.reduce((sum, r) => sum + Number(r.amount), 0),
        charges: rows.length,
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
    select: {
      id: true,
      billingMode: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          startDate: true,
          feeOverride: true,
          discountPercent: true,
          course: { select: { monthlyFee: true } },
        },
      },
    },
  })
  // Each student's active enrolments as { startDate, fee }, so a given month only
  // counts enrolments that had started by then — mirrors loadMonthFeeRows and the
  // charge generator (a 2nd course added mid-year isn't billed for earlier months).
  const enrolByStudent = new Map<string, { startDate: Date; fee: number }[]>()
  for (const s of students) {
    enrolByStudent.set(
      s.id,
      s.enrollments.map((e) => ({
        startDate: e.startDate,
        fee: effectiveFee(
          Number(e.course.monthlyFee),
          e.feeOverride != null ? Number(e.feeOverride) : null,
          e.discountPercent != null ? Number(e.discountPercent) : null
        ),
      }))
    )
  }
  const modeById = new Map(students.map((s) => [s.id, s.billingMode]))
  const ids = students.map((s) => s.id)

  const [groups, waiverGroups, installGroups] = ids.length
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
        prisma.feeCharge.groupBy({
          by: ["studentId", "periodYear", "periodMonth"],
          where: { instituteId, studentId: { in: ids }, type: "INSTALLMENT", periodYear: { not: null } },
          _sum: { amount: true },
        }),
      ])
    : [[], [], []]

  // Installment students' expected/collected per month comes from their INSTALLMENT
  // charges (not effectiveFee); monthly students keep the enrolment-fee path.
  const installByKey = new Map<string, number>()
  for (const g of installGroups) {
    if (g.periodYear == null || g.periodMonth == null) continue
    installByKey.set(`${g.studentId}:${g.periodYear}-${g.periodMonth}`, Number(g._sum.amount ?? 0))
  }
  const feeForMonth = (sid: string, y: number, m: number) => {
    if (modeById.get(sid) === "INSTALLMENT") return installByKey.get(`${sid}:${y}-${m}`) ?? 0
    const cutoff = appMonthStartUtc(y, m + 1)
    return (enrolByStudent.get(sid) ?? []).reduce(
      (sum, e) => (e.startDate < cutoff ? sum + e.fee : sum),
      0
    )
  }

  // Per student-month waived amount, so net due = fee - waived everywhere.
  const wKey = (sid: string, y: number, m: number) => `${sid}:${y}-${m}`
  const waivedMap = new Map<string, number>()
  for (const g of waiverGroups) {
    waivedMap.set(wKey(g.studentId, g.periodYear, g.periodMonth), Number(g._sum.amount ?? 0))
  }

  const collectedByMonth: Record<string, number> = {}
  for (const g of groups) {
    if (g.periodYear == null || g.periodMonth == null) continue
    const fee = feeForMonth(g.studentId, g.periodYear, g.periodMonth)
    const waived = waivedMap.get(wKey(g.studentId, g.periodYear, g.periodMonth)) ?? 0
    const netDue = Math.max(0, fee - waived)
    const cover = Math.min(Number(g._sum.amount ?? 0), netDue)
    const key = `${g.periodYear}-${g.periodMonth}`
    collectedByMonth[key] = (collectedByMonth[key] ?? 0) + cover
  }

  // A window of months around now. Expected for each month counts only enrolments
  // that had started by then (per-enrolment startDate), net of waivers — a waived
  // month lowers what's expected to be collected in cash.
  const nowYM = appYearMonth(nowDate())
  const byMonth: Record<string, { collected: number; expected: number }> = {}
  for (let off = -5; off <= 1; off++) {
    const { year: y, month: m } = appYearMonth(
      appMonthStartUtc(nowYM.year, nowYM.month + off)
    )
    const key = `${y}-${m}`
    const expected = students.reduce((sum, s) => {
      const waived = waivedMap.get(wKey(s.id, y, m)) ?? 0
      return sum + Math.max(0, feeForMonth(s.id, y, m) - waived)
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
