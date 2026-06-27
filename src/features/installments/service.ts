import "server-only"

import { Prisma, PrismaClient } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { appYearMonth, nowDate } from "@/lib/date-helper"
import { installmentStatus } from "@/features/installments/logic"
import type { InstallmentPlan, InstallmentPlanItem } from "@/features/installments/types"
import type { SavePlanInput } from "@/features/installments/schema"

type Tx = PrismaClient | Prisma.TransactionClient

const round2 = (n: number) => Math.round(n * 100) / 100

// A plan row with its materialized charge's settlement rows, for lock/status math.
const planRowInclude = {
  charge: {
    select: {
      id: true,
      amount: true,
      dueDate: true,
      payments: { select: { amount: true } },
      waivers: { select: { amount: true } },
    },
  },
} satisfies Prisma.StudentInstallmentInclude

type PlanRow = Prisma.StudentInstallmentGetPayload<{ include: typeof planRowInclude }>

function settlement(r: PlanRow): { paid: number; waived: number } {
  const paid = (r.charge?.payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const waived = (r.charge?.waivers ?? []).reduce((s, w) => s + Number(w.amount), 0)
  return { paid: round2(paid), waived: round2(waived) }
}

const isLocked = (r: PlanRow) => {
  const { paid, waived } = settlement(r)
  return paid + waived > 0.001
}

/** A student's installment schedule (ordered by due date) with per-row settlement +
 *  lock/status, plus the student's current billing mode. */
export async function getInstallmentPlan(
  instituteId: string,
  studentId: string
): Promise<InstallmentPlan> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
    select: { id: true, billingMode: true },
  })
  if (!student) throw new NotFoundError("Student not found.")

  const rows = await prisma.studentInstallment.findMany({
    where: { instituteId, studentId },
    orderBy: [{ dueDate: "asc" }, { seq: "asc" }],
    include: planRowInclude,
  })

  const now = appYearMonth(nowDate())
  const items: InstallmentPlanItem[] = rows.map((r, i) => {
    const amount = Number(r.amount)
    const { paid, waived } = settlement(r)
    const due = appYearMonth(r.dueDate)
    return {
      id: r.id,
      seq: i + 1,
      dueDate: r.dueDate.toISOString(),
      amount,
      label: r.label,
      paid,
      waived,
      outstanding: round2(Math.max(0, amount - paid - waived)),
      locked: paid + waived > 0.001,
      status: installmentStatus({
        amount,
        paid,
        waived,
        dueYear: due.year,
        dueMonth: due.month,
        nowYear: now.year,
        nowMonth: now.month,
      }),
    }
  })

  return {
    studentId,
    billingMode: student.billingMode,
    items,
    total: round2(items.reduce((s, it) => s + it.amount, 0)),
  }
}

// Materialize (or re-materialize) the one immutable INSTALLMENT charge for a plan
// row. Only ever called for UNPAID rows, so deleting+recreating loses no money.
async function materializeCharge(
  tx: Tx,
  args: {
    instituteId: string
    studentId: string
    studentInstallmentId: string
    dueDate: Date
    amount: number
    label: string | null
    existingChargeId?: string | null
  }
): Promise<void> {
  if (args.existingChargeId) await tx.feeCharge.delete({ where: { id: args.existingChargeId } })
  const { year, month } = appYearMonth(args.dueDate)
  await tx.feeCharge.create({
    data: {
      instituteId: args.instituteId,
      studentId: args.studentId,
      enrollmentId: null,
      type: "INSTALLMENT",
      label: args.label,
      periodYear: year,
      periodMonth: month,
      amount: args.amount,
      dueDate: args.dueDate,
      studentInstallmentId: args.studentInstallmentId,
    },
  })
}

/**
 * Save a student's installment schedule and put them in INSTALLMENT billing. The
 * input is the full ordered list; rows carry an `id` when they already exist.
 *  - Settled (paid/partially-paid) rows are LOCKED: they can't be edited or removed
 *    (reverse the payment first) — rejected with a clear error.
 *  - Unpaid rows are upserted and their immutable INSTALLMENT charge re-materialized.
 *  - Removed unpaid rows (and their unpaid charges) are deleted.
 */
export async function saveInstallmentPlan(
  instituteId: string,
  studentId: string,
  input: SavePlanInput
): Promise<InstallmentPlan> {
  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: studentId, instituteId },
      select: { id: true },
    })
    if (!student) throw new NotFoundError("Student not found.")

    const existing = await tx.studentInstallment.findMany({
      where: { instituteId, studentId },
      include: planRowInclude,
    })
    const byId = new Map(existing.map((r) => [r.id, r]))
    const keptIds = new Set(input.rows.flatMap((r) => (r.id ? [r.id] : [])))

    // Guard locked rows: can't drop or edit a settled installment.
    for (const r of existing) {
      if (!keptIds.has(r.id) && isLocked(r)) {
        throw new ValidationError("A paid installment can't be removed — reverse its payment first.")
      }
    }
    for (const row of input.rows) {
      if (!row.id) continue
      const ex = byId.get(row.id)
      if (!ex) throw new ValidationError("An installment no longer exists — reload and retry.")
      if (isLocked(ex)) {
        const unchanged = Number(ex.amount) === row.amount && ex.dueDate.getTime() === row.dueDate.getTime()
        if (!unchanged) {
          throw new ValidationError("A paid installment can't be edited — reverse its payment first.")
        }
      }
    }

    // Delete removed (unpaid) rows + their unpaid charges.
    for (const r of existing) {
      if (keptIds.has(r.id)) continue
      if (r.charge) await tx.feeCharge.delete({ where: { id: r.charge.id } })
      await tx.studentInstallment.delete({ where: { id: r.id } })
    }

    // Upsert kept + new rows; re-materialize the charge for unpaid rows. `seq` is a
    // stable, never-reused key (display order is by due date) so we never reseq and
    // trip @@unique([studentId, seq]).
    let maxSeq = existing.reduce((m, r) => Math.max(m, r.seq), 0)
    for (const row of input.rows) {
      const label = row.label ?? null
      const ex = row.id ? byId.get(row.id) : undefined
      if (ex) {
        if (isLocked(ex)) continue // unchanged (validated above) — leave row + charge intact
        await tx.studentInstallment.update({
          where: { id: ex.id },
          data: { dueDate: row.dueDate, amount: row.amount, label },
        })
        await materializeCharge(tx, {
          instituteId,
          studentId,
          studentInstallmentId: ex.id,
          dueDate: row.dueDate,
          amount: row.amount,
          label,
          existingChargeId: ex.charge?.id ?? null,
        })
      } else {
        maxSeq += 1
        const created = await tx.studentInstallment.create({
          data: { instituteId, studentId, seq: maxSeq, dueDate: row.dueDate, amount: row.amount, label },
          select: { id: true },
        })
        await materializeCharge(tx, {
          instituteId,
          studentId,
          studentInstallmentId: created.id,
          dueDate: row.dueDate,
          amount: row.amount,
          label,
        })
      }
    }

    await tx.student.update({ where: { id: studentId }, data: { billingMode: "INSTALLMENT" } })
  })

  return getInstallmentPlan(instituteId, studentId)
}

/**
 * Delete a student's UNPAID installment charges + their plan rows. Settled (paid/
 * waived) rows are always kept as history. With `futureOnly`, only future-dated
 * unpaid rows are dropped — used on LEAVE/COMPLETED/archive, where past-due dues
 * stay owed and remain visible (the student keeps INSTALLMENT billing). Without it,
 * ALL unpaid rows go — used on switch-to-MONTHLY, so a monthly student never carries
 * an orphaned installment charge that's invisible in the UI yet inflates their totals.
 */
export async function voidUnpaidInstallmentsTx(
  tx: Tx,
  instituteId: string,
  studentId: string,
  opts: { futureOnly: boolean }
): Promise<void> {
  const now = appYearMonth(nowDate())
  const rows = await tx.studentInstallment.findMany({
    where: { instituteId, studentId },
    include: planRowInclude,
  })
  for (const r of rows) {
    if (isLocked(r)) continue // keep settled installments as history
    if (opts.futureOnly) {
      const due = appYearMonth(r.dueDate)
      const isFuture = due.year > now.year || (due.year === now.year && due.month > now.month)
      if (!isFuture) continue
    }
    if (r.charge) await tx.feeCharge.delete({ where: { id: r.charge.id } })
    await tx.studentInstallment.delete({ where: { id: r.id } })
  }
}

/** Switch a student back to MONTHLY billing, voiding future unpaid installments. */
export async function setMonthlyBilling(
  instituteId: string,
  studentId: string
): Promise<InstallmentPlan> {
  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: studentId, instituteId },
      select: { id: true },
    })
    if (!student) throw new NotFoundError("Student not found.")
    await voidUnpaidInstallmentsTx(tx, instituteId, studentId, { futureOnly: false })
    await tx.student.update({ where: { id: studentId }, data: { billingMode: "MONTHLY" } })
  })
  return getInstallmentPlan(instituteId, studentId)
}
