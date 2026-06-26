import "server-only"

import { Prisma, PrismaClient, type EnrollmentStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import { appYearMonth, appMonthStartUtc, nowDate } from "@/lib/date-helper"
import { effectiveFee } from "@/features/fees/logic"
import type { EnrollmentItem } from "@/features/enrollment/types"
import type {
  EnrollmentCreateInput,
  EnrollmentUpdateInput,
  OneTimeChargeInput,
} from "@/features/enrollment/schema"

type Tx = PrismaClient | Prisma.TransactionClient

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Idempotently generate one TUITION charge per month from the enrolment's start
 * through the current month, at `monthlyFee`. Deduped by the unique
 * (enrollmentId, type, periodYear, periodMonth) index, so it's safe to re-run as
 * time advances (a cron could replace these calls later). Bills start→now while
 * the enrolment is ACTIVE — unbounded by the course duration (duration is catalog
 * metadata; status ends billing), preserving the legacy month-walk exactly.
 */
async function ensureTuitionCharges(
  tx: Tx,
  e: { id: string; studentId: string; instituteId: string; startDate: Date },
  monthlyFee: number
): Promise<void> {
  const start = appYearMonth(e.startDate)
  const now = appYearMonth(nowDate())
  const rows: Prisma.FeeChargeCreateManyInput[] = []
  let y = start.year
  let m = start.month
  while (y < now.year || (y === now.year && m <= now.month)) {
    rows.push({
      instituteId: e.instituteId,
      enrollmentId: e.id,
      studentId: e.studentId,
      type: "TUITION",
      periodMonth: m,
      periodYear: y,
      amount: monthlyFee,
      dueDate: appMonthStartUtc(y, m),
    })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  if (rows.length) await tx.feeCharge.createMany({ data: rows, skipDuplicates: true })
}

/**
 * Lazily top up TUITION charges to the current month for all of a student's ACTIVE
 * enrolments, at each enrolment's effective fee. Called on the fee read/record
 * paths so the ledger is always current without a cron. Idempotent.
 */
export async function ensureChargesForStudent(
  instituteId: string,
  studentId: string
): Promise<void> {
  const enrollments = await prisma.enrollment.findMany({
    where: { instituteId, studentId, status: "ACTIVE" },
    include: { course: { select: { monthlyFee: true } } },
  })
  for (const e of enrollments) {
    const monthly = effectiveFee(
      Number(e.course.monthlyFee),
      e.feeOverride != null ? Number(e.feeOverride) : null,
      e.discountPercent != null ? Number(e.discountPercent) : null
    )
    await ensureTuitionCharges(
      prisma,
      { id: e.id, studentId, instituteId, startDate: e.startDate },
      monthly
    )
  }
}

type Ledger = { charged: number; paid: number; waived: number; outstanding: number }

/**
 * Ledger roll-up per enrolment. `outstanding` is summed per charge and capped at
 * zero (an overpaid/prepaid charge can't offset another's shortfall) — identical
 * to the legacy month-walk. `paid`/`waived` are net of reversals (rows are
 * signed). Payments/waivers with no chargeId (e.g. prepaid future) count as cash
 * but don't reduce outstanding — they're advance, exactly like before.
 */
async function ledgerByEnrollment(ids: string[]): Promise<Map<string, Ledger>> {
  const out = new Map<string, Ledger>(
    ids.map((id) => [id, { charged: 0, paid: 0, waived: 0, outstanding: 0 }])
  )
  if (!ids.length) return out

  const [charges, pays, waivs] = await Promise.all([
    prisma.feeCharge.findMany({
      where: { enrollmentId: { in: ids } },
      select: { id: true, enrollmentId: true, amount: true },
    }),
    prisma.feePayment.findMany({
      where: { enrollmentId: { in: ids } },
      select: { enrollmentId: true, chargeId: true, amount: true },
    }),
    prisma.feeWaiver.findMany({
      where: { enrollmentId: { in: ids } },
      select: { enrollmentId: true, chargeId: true, amount: true },
    }),
  ])

  const paidByCharge = new Map<string, number>()
  const waivedByCharge = new Map<string, number>()
  for (const p of pays) {
    const agg = p.enrollmentId ? out.get(p.enrollmentId) : undefined
    if (!agg) continue
    agg.paid += Number(p.amount)
    if (p.chargeId) paidByCharge.set(p.chargeId, (paidByCharge.get(p.chargeId) ?? 0) + Number(p.amount))
  }
  for (const w of waivs) {
    const agg = w.enrollmentId ? out.get(w.enrollmentId) : undefined
    if (!agg) continue
    agg.waived += Number(w.amount)
    if (w.chargeId) waivedByCharge.set(w.chargeId, (waivedByCharge.get(w.chargeId) ?? 0) + Number(w.amount))
  }
  for (const c of charges) {
    const agg = out.get(c.enrollmentId)!
    const amt = Number(c.amount)
    agg.charged += amt
    agg.outstanding += Math.max(0, amt - (paidByCharge.get(c.id) ?? 0) - (waivedByCharge.get(c.id) ?? 0))
  }
  for (const v of out.values()) {
    v.charged = round2(v.charged)
    v.paid = round2(v.paid)
    v.waived = round2(v.waived)
    v.outstanding = round2(v.outstanding)
  }
  return out
}

type EnrollmentRow = Prisma.EnrollmentGetPayload<{
  include: { course: { select: { name: true; monthlyFee: true } } }
}>

function toItem(e: EnrollmentRow, ledger: Ledger): EnrollmentItem {
  const override = e.feeOverride != null ? Number(e.feeOverride) : null
  const discountPercent = e.discountPercent != null ? Number(e.discountPercent) : null
  return {
    id: e.id,
    studentId: e.studentId,
    courseId: e.courseId,
    courseName: e.course.name,
    startDate: e.startDate.toISOString(),
    feeOverride: override,
    discountPercent,
    effectiveFee: effectiveFee(Number(e.course.monthlyFee), override, discountPercent),
    courseMonthlyFee: Number(e.course.monthlyFee),
    status: e.status,
    ...ledger,
  }
}

export async function listEnrollments(
  instituteId: string,
  studentId: string
): Promise<EnrollmentItem[]> {
  const rows = await prisma.enrollment.findMany({
    where: { instituteId, studentId },
    include: { course: { select: { name: true, monthlyFee: true } } },
    orderBy: { createdAt: "asc" },
  })
  const ledger = await ledgerByEnrollment(rows.map((e) => e.id))
  return rows.map((e) => toItem(e, ledger.get(e.id)!))
}

async function oneItem(instituteId: string, studentId: string, id: string): Promise<EnrollmentItem> {
  const item = (await listEnrollments(instituteId, studentId)).find((i) => i.id === id)
  if (!item) throw new NotFoundError("Enrolment not found.")
  return item
}

type CourseForEnrol = {
  id: string
  monthlyFee: Prisma.Decimal | number
  components: { name: string; amount: Prisma.Decimal | number }[]
}

/**
 * Create an enrolment + its charges inside an EXISTING transaction: one-time
 * charges from the course's components (due at start), then idempotent tuition
 * charges to now when ACTIVE. Returns the new enrolment id. Shared by the public
 * createEnrollment and the student-create flow so both are atomic.
 */
export async function enrollInTx(
  tx: Tx,
  p: {
    instituteId: string
    studentId: string
    course: CourseForEnrol
    startDate: Date
    feeOverride: number | null
    discountPercent: number | null
    status: EnrollmentStatus
  }
): Promise<string> {
  const monthly = effectiveFee(Number(p.course.monthlyFee), p.feeOverride, p.discountPercent)
  const e = await tx.enrollment.create({
    data: {
      instituteId: p.instituteId,
      studentId: p.studentId,
      courseId: p.course.id,
      startDate: p.startDate,
      feeOverride: p.feeOverride,
      discountPercent: p.discountPercent,
      status: p.status,
    },
    select: { id: true },
  })
  if (p.course.components.length) {
    await tx.feeCharge.createMany({
      data: p.course.components.map((c) => ({
        instituteId: p.instituteId,
        enrollmentId: e.id,
        studentId: p.studentId,
        type: "ONE_TIME" as const,
        label: c.name,
        amount: c.amount,
        dueDate: p.startDate,
      })),
    })
  }
  if (p.status === "ACTIVE") {
    await ensureTuitionCharges(
      tx,
      { id: e.id, studentId: p.studentId, instituteId: p.instituteId, startDate: p.startDate },
      monthly
    )
  }
  return e.id
}

/** Find/create the per-institute "General" course — the fallback for students
 * whose class has no course (or who have no class). */
export async function ensureGeneralCourse(tx: Tx, instituteId: string): Promise<CourseForEnrol> {
  // Upsert (not find-then-create) so two concurrent first-enrolments don't both
  // create a "General" course and trip the (instituteId, nameKey) unique — which,
  // inside a transaction, would poison the whole tx, not just retry.
  const c = await tx.course.upsert({
    where: { instituteId_nameKey: { instituteId, nameKey: "general" } },
    create: { instituteId, name: "General", nameKey: "general", durationMonths: 12, monthlyFee: 0 },
    update: {},
    select: { id: true, monthlyFee: true },
  })
  return { id: c.id, monthlyFee: c.monthlyFee, components: [] }
}

async function resolveCourseForClass(
  tx: Tx,
  instituteId: string,
  classId: string | null
): Promise<CourseForEnrol> {
  if (classId) {
    const cls = await tx.class.findFirst({
      where: { id: classId, instituteId },
      select: { courseId: true },
    })
    if (cls?.courseId) {
      const course = await tx.course.findFirst({
        where: { id: cls.courseId, instituteId },
        select: { id: true, monthlyFee: true, components: { select: { name: true, amount: true } } },
      })
      if (course) return course
    }
  }
  return ensureGeneralCourse(tx, instituteId)
}

/** Auto-enrol a freshly-created student into their class's course (or General) at
 * the course rate (custom rates / scholarships are set per-enrolment afterwards).
 * Runs inside createStudent's transaction so student + enrolment commit together. */
export async function enrollStudentInClassCourseTx(
  tx: Tx,
  p: { instituteId: string; studentId: string; classId: string | null; startDate: Date }
): Promise<void> {
  const course = await resolveCourseForClass(tx, p.instituteId, p.classId)
  await enrollInTx(tx, {
    instituteId: p.instituteId,
    studentId: p.studentId,
    course,
    startDate: p.startDate,
    // Inherit the course rate; scholarships/custom rates are set per-enrolment.
    feeOverride: null,
    discountPercent: null,
    status: "ACTIVE",
  })
}

/**
 * Keep the student's class-derived enrolment in step with edits to their class or
 * fee (dual-write during the transition). Re-points the ACTIVE enrolment that sits
 * on the OLD class's course to the NEW class's course, and syncs its fee override.
 * Manually-added enrolments (on other courses) are left untouched. Tuition charges
 * are topped up to now; past charges are immutable, so a fee change only affects
 * months not yet billed.
 */
export async function syncStudentEnrollmentTx(
  tx: Tx,
  p: {
    instituteId: string
    studentId: string
    oldClassId: string | null
    newClassId: string | null
    // The new fee (switches the enrolment to a fixed override, clearing any %), or
    // null to leave the fee/discount untouched (e.g. a class move with no fee change).
    newFee: number | null
  }
): Promise<void> {
  const oldCourse = await resolveCourseForClass(tx, p.instituteId, p.oldClassId)
  const newCourse = await resolveCourseForClass(tx, p.instituteId, p.newClassId)
  const primaries = await tx.enrollment.findMany({
    where: {
      instituteId: p.instituteId,
      studentId: p.studentId,
      courseId: oldCourse.id,
      status: "ACTIVE",
    },
    select: { id: true, startDate: true, feeOverride: true, discountPercent: true },
  })
  for (const e of primaries) {
    const data: Prisma.EnrollmentUpdateInput = { course: { connect: { id: newCourse.id } } }
    if (p.newFee != null) {
      // An explicit fee edit makes the enrolment a fixed override, clearing any %.
      data.feeOverride = p.newFee
      data.discountPercent = null
    }
    await tx.enrollment.update({ where: { id: e.id }, data })

    const fo = p.newFee != null ? p.newFee : e.feeOverride != null ? Number(e.feeOverride) : null
    const dp = p.newFee != null ? null : e.discountPercent != null ? Number(e.discountPercent) : null
    await ensureTuitionCharges(
      tx,
      { id: e.id, studentId: p.studentId, instituteId: p.instituteId, startDate: e.startDate },
      effectiveFee(Number(newCourse.monthlyFee), fo, dp)
    )
  }
}

export async function createEnrollment(
  instituteId: string,
  input: EnrollmentCreateInput
): Promise<EnrollmentItem> {
  const id = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: input.studentId, instituteId },
      select: { id: true },
    })
    if (!student) throw new NotFoundError("Student not found.")
    const course = await tx.course.findFirst({
      where: { id: input.courseId, instituteId },
      select: { id: true, monthlyFee: true, components: { select: { name: true, amount: true } } },
    })
    if (!course) throw new NotFoundError("Course not found.")
    return enrollInTx(tx, {
      instituteId,
      studentId: input.studentId,
      course,
      startDate: input.startDate,
      feeOverride: input.feeOverride ?? null,
      discountPercent: input.discountPercent ?? null,
      status: input.status,
    })
  })
  return oneItem(instituteId, input.studentId, id)
}

export async function updateEnrollment(
  instituteId: string,
  id: string,
  input: EnrollmentUpdateInput
): Promise<EnrollmentItem> {
  const existing = await prisma.enrollment.findFirst({
    where: { id, instituteId },
    select: { id: true, studentId: true },
  })
  if (!existing) throw new NotFoundError("Enrolment not found.")

  const data: Prisma.EnrollmentUpdateInput = {}
  // A fixed override and a percent discount are mutually exclusive — setting one
  // clears the other, so a partial PATCH can never leave both set (which would let
  // effectiveFee silently prefer the discount over the just-set override).
  if (input.feeOverride !== undefined) {
    data.feeOverride = input.feeOverride ?? null
    if (input.feeOverride != null) data.discountPercent = null
  }
  if (input.discountPercent !== undefined) {
    data.discountPercent = input.discountPercent ?? null
    if (input.discountPercent != null) data.feeOverride = null
  }
  if (input.status !== undefined) data.status = input.status
  await prisma.enrollment.update({ where: { id }, data })

  // Re-read to get the effective rate, then top up tuition charges to now when
  // active. Existing charges are immutable, so a changed override only affects
  // months not yet generated (correct accrual — adjust past charges explicitly).
  const e = await prisma.enrollment.findFirstOrThrow({
    where: { id },
    include: { course: { select: { monthlyFee: true } } },
  })
  if (e.status === "ACTIVE") {
    const monthly = effectiveFee(
      Number(e.course.monthlyFee),
      e.feeOverride != null ? Number(e.feeOverride) : null,
      e.discountPercent != null ? Number(e.discountPercent) : null
    )
    await ensureTuitionCharges(
      prisma,
      { id: e.id, studentId: e.studentId, instituteId, startDate: e.startDate },
      monthly
    )
  }

  return oneItem(instituteId, existing.studentId, id)
}

export async function addOneTimeCharge(
  instituteId: string,
  enrollmentId: string,
  input: OneTimeChargeInput
): Promise<EnrollmentItem> {
  const e = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, instituteId },
    select: { id: true, studentId: true },
  })
  if (!e) throw new NotFoundError("Enrolment not found.")

  await prisma.feeCharge.create({
    data: {
      instituteId,
      enrollmentId,
      studentId: e.studentId,
      type: "ONE_TIME",
      label: input.label,
      amount: input.amount,
      dueDate: input.dueDate ?? nowDate(),
    },
  })
  return oneItem(instituteId, e.studentId, enrollmentId)
}
