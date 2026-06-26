// Phase 0c of the fee-ledger refactor — backfill + reconciliation gate.
//
// Builds the new Course → Enrollment → FeeCharge model from the legacy
// Student.monthlyFee data, then RECONCILES: asserts the ledger's outstanding
// equals the legacy month-walk outstanding for every student. Idempotent — safe
// to re-run. Connects via DIRECT_URL (sandbox in dev). Run with:
//
//   pnpm exec tsx prisma/scripts/backfill-fee-ledger.ts
//
// Exits non-zero if ANY student fails reconciliation (this is the prod gate).
//
// Self-contained on purpose: the IST month math is replicated from
// src/lib/date-helper.ts (appYearMonth / appMonthStartUtc) with Luxon so the
// gate can't drift from the app, and there are no "@/" path imports to resolve.

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { config as loadEnv } from "dotenv"
import { DateTime } from "luxon"

loadEnv()

const TZ = "Asia/Kolkata" // must match APP_TIMEZONE in src/lib/date-helper.ts
const DURATION_DEFAULT = 12 // nominal course length; does NOT cap monthly billing

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DIRECT_URL as string),
})

type YM = { year: number; month: number }

// IST calendar { year, month } for a UTC instant — mirrors appYearMonth().
function ymOf(date: Date): YM {
  const dt = DateTime.fromJSDate(date, { zone: TZ })
  return { year: dt.year, month: dt.month }
}
// UTC instant at IST month start — mirrors appMonthStartUtc().
function monthStartUtc(year: number, month: number): Date {
  return DateTime.fromObject({ year, month, day: 1 }, { zone: TZ }).toJSDate()
}
function monthsInclusive(from: YM, to: YM): YM[] {
  const out: YM[] = []
  let y = from.year
  let m = from.month
  while (y < to.year || (y === to.year && m <= to.month)) {
    out.push({ year: y, month: m })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}
const periodKey = (y: number | null, m: number | null) => `${y}-${m}`
const courseKey = (s: string) => s.toLowerCase().replace(/\s+/g, "")
const round2 = (n: number) => Math.round(n * 100) / 100

async function backfill(nowYM: YM) {
  let courses = 0
  let enrollments = 0
  let charges = 0
  let linkedPayments = 0
  let linkedWaivers = 0

  const institutes = await prisma.institute.findMany({ select: { id: true } })

  for (const inst of institutes) {
    // ── 1. One Course per Class (idempotent: skip classes already linked) ──
    const classes = await prisma.class.findMany({
      where: { instituteId: inst.id },
      select: { id: true, name: true, defaultMonthlyFee: true, courseId: true },
    })
    const courseByClassId = new Map<string, string>()
    for (const cls of classes) {
      if (cls.courseId) {
        courseByClassId.set(cls.id, cls.courseId)
        continue
      }
      // Course is named after the class only (no section) for now; sections of the
      // same class name collapse onto one shared course via the nameKey upsert.
      const name = cls.name.trim()
      const course = await prisma.course.upsert({
        where: { instituteId_nameKey: { instituteId: inst.id, nameKey: courseKey(name) } },
        create: {
          instituteId: inst.id,
          name,
          nameKey: courseKey(name),
          durationMonths: DURATION_DEFAULT,
          monthlyFee: cls.defaultMonthlyFee ?? 0,
        },
        update: {},
        select: { id: true },
      })
      courses += 1
      await prisma.class.update({ where: { id: cls.id }, data: { courseId: course.id } })
      courseByClassId.set(cls.id, course.id)
    }

    // A "General" course for class-less students, created lazily on first need.
    let generalCourseId: string | null = null
    const ensureGeneral = async (): Promise<string> => {
      if (generalCourseId) return generalCourseId
      const c = await prisma.course.upsert({
        where: { instituteId_nameKey: { instituteId: inst.id, nameKey: "general" } },
        create: {
          instituteId: inst.id,
          name: "General",
          nameKey: "general",
          durationMonths: DURATION_DEFAULT,
          monthlyFee: 0,
        },
        update: {},
        select: { id: true },
      })
      generalCourseId = c.id
      return c.id
    }

    // ── 2-4. Enrollment + charges + credit links, per student ──
    const students = await prisma.student.findMany({
      where: { instituteId: inst.id },
      select: { id: true, classId: true, admissionDate: true, monthlyFee: true },
    })
    for (const st of students) {
      const courseId = st.classId
        ? courseByClassId.get(st.classId) ?? (await ensureGeneral())
        : await ensureGeneral()

      // 2. Enrollment (one per student; feeOverride preserves the exact fee)
      let enrollmentId: string
      const existing = await prisma.enrollment.findFirst({
        where: { studentId: st.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
      if (existing) {
        enrollmentId = existing.id
      } else {
        const e = await prisma.enrollment.create({
          data: {
            instituteId: inst.id,
            studentId: st.id,
            courseId,
            startDate: st.admissionDate,
            feeOverride: st.monthlyFee,
            status: "ACTIVE",
          },
          select: { id: true },
        })
        enrollmentId = e.id
        enrollments += 1
      }

      // 3. TUITION charges, one per month admission→now (deduped by unique index)
      const months = monthsInclusive(ymOf(st.admissionDate), nowYM)
      const created = await prisma.feeCharge.createMany({
        data: months.map((ym) => ({
          instituteId: inst.id,
          enrollmentId,
          studentId: st.id,
          type: "TUITION" as const,
          periodMonth: ym.month,
          periodYear: ym.year,
          amount: st.monthlyFee,
          dueDate: monthStartUtc(ym.year, ym.month),
        })),
        skipDuplicates: true,
      })
      charges += created.count

      const chargeByPeriod = new Map<string, string>()
      for (const c of await prisma.feeCharge.findMany({
        where: { enrollmentId, type: "TUITION" },
        select: { id: true, periodYear: true, periodMonth: true },
      })) {
        chargeByPeriod.set(periodKey(c.periodYear, c.periodMonth), c.id)
      }

      // 4. Link payments + waivers to the enrollment (and the period's charge)
      for (const p of await prisma.feePayment.findMany({
        where: { studentId: st.id, enrollmentId: null },
        select: { id: true, periodYear: true, periodMonth: true },
      })) {
        const chargeId =
          p.periodYear != null && p.periodMonth != null
            ? chargeByPeriod.get(periodKey(p.periodYear, p.periodMonth)) ?? null
            : null
        await prisma.feePayment.update({ where: { id: p.id }, data: { enrollmentId, chargeId } })
        linkedPayments += 1
      }
      for (const w of await prisma.feeWaiver.findMany({
        where: { studentId: st.id, enrollmentId: null },
        select: { id: true, periodYear: true, periodMonth: true },
      })) {
        const chargeId = chargeByPeriod.get(periodKey(w.periodYear, w.periodMonth)) ?? null
        await prisma.feeWaiver.update({ where: { id: w.id }, data: { enrollmentId, chargeId } })
        linkedWaivers += 1
      }
    }
  }

  console.log(
    `Backfill: +${courses} courses, +${enrollments} enrollments, +${charges} charges, linked ${linkedPayments} payments / ${linkedWaivers} waivers`
  )
}

async function reconcile(nowYM: YM): Promise<boolean> {
  const students = await prisma.student.findMany({
    select: { id: true, fullName: true, admissionDate: true, monthlyFee: true },
  })

  let ok = 0
  const mismatches: string[] = []

  for (const st of students) {
    const fee = Number(st.monthlyFee)

    // Legacy: month-walk admission→now, capped per month (the current engine).
    const pays = await prisma.feePayment.findMany({
      where: { studentId: st.id },
      select: { amount: true, periodYear: true, periodMonth: true, chargeId: true },
    })
    const waivs = await prisma.feeWaiver.findMany({
      where: { studentId: st.id },
      select: { amount: true, periodYear: true, periodMonth: true, chargeId: true },
    })
    const paidByPeriod = new Map<string, number>()
    for (const p of pays) {
      if (p.periodYear == null || p.periodMonth == null) continue
      const k = periodKey(p.periodYear, p.periodMonth)
      paidByPeriod.set(k, (paidByPeriod.get(k) ?? 0) + Number(p.amount))
    }
    const waivedByPeriod = new Map<string, number>()
    for (const w of waivs) {
      const k = periodKey(w.periodYear, w.periodMonth)
      waivedByPeriod.set(k, (waivedByPeriod.get(k) ?? 0) + Number(w.amount))
    }
    let legacy = 0
    for (const ym of monthsInclusive(ymOf(st.admissionDate), nowYM)) {
      const k = periodKey(ym.year, ym.month)
      legacy += Math.max(0, fee - (waivedByPeriod.get(k) ?? 0) - (paidByPeriod.get(k) ?? 0))
    }

    // Ledger: Σ over TUITION charges of max(0, amount − paid − waived), via chargeId.
    const charges = await prisma.feeCharge.findMany({
      where: { studentId: st.id, type: "TUITION" },
      select: { id: true, amount: true },
    })
    const paidByCharge = new Map<string, number>()
    for (const p of pays) {
      if (!p.chargeId) continue
      paidByCharge.set(p.chargeId, (paidByCharge.get(p.chargeId) ?? 0) + Number(p.amount))
    }
    const waivedByCharge = new Map<string, number>()
    for (const w of waivs) {
      if (!w.chargeId) continue
      waivedByCharge.set(w.chargeId, (waivedByCharge.get(w.chargeId) ?? 0) + Number(w.amount))
    }
    let ledger = 0
    for (const c of charges) {
      ledger += Math.max(
        0,
        Number(c.amount) - (waivedByCharge.get(c.id) ?? 0) - (paidByCharge.get(c.id) ?? 0)
      )
    }

    if (round2(legacy) === round2(ledger)) ok += 1
    else mismatches.push(`  ✗ ${st.fullName} (${st.id}): legacy=${round2(legacy)} ledger=${round2(ledger)}`)
  }

  console.log(`Reconciliation: ${ok}/${students.length} students match`)
  if (mismatches.length) {
    console.error(`MISMATCHES (${mismatches.length}):\n${mismatches.join("\n")}`)
    return false
  }
  console.log("✓ Reconciliation gate PASSED — ledger outstanding == legacy outstanding for all students.")
  return true
}

async function main() {
  // One "now" for both phases so a month rollover mid-run can't desync them.
  const nowDT = DateTime.now().setZone(TZ)
  const nowYM: YM = { year: nowDT.year, month: nowDT.month }
  await backfill(nowYM)
  const passed = await reconcile(nowYM)
  if (!passed) process.exitCode = 1
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
