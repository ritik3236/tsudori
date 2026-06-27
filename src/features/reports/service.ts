import "server-only"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/tenant"
import type { TenantContext } from "@/lib/tenant"
import {
  appMonthBounds,
  formatMonthLabel,
  nowDate,
  todayInAppTz,
} from "@/lib/date-helper"
import { feeMonthSummary, feeMonthlyOverview } from "@/features/fees/service"
import { REPORTS, REPORT_COLORS } from "./registry"
import type { ReportConfig, ReportId, ReportParams, ReportResult } from "./types"

// The execute engine: a dispatcher turning a validated ReportConfig into a uniform
// ReportResult. It reuses the same fee/attendance reads the trusted screens use, so
// the numbers match — and is scoped by instituteId + gated by each report's
// required permission, the real authorization boundary.

type ReportBase = Omit<ReportResult, "generatedAt" | "source">

const round = (n: number) => Math.round(n)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

function currentMonthStr(): string {
  return todayInAppTz().slice(0, 7)
}

/** Applies defaults + clamps a raw (AI- or client-supplied) request into a config. */
export function resolveReportConfig(
  input: { reportId: ReportId } & ReportParams
): ReportConfig {
  if (input.reportId === "fee-collection-trend") {
    const n = Math.min(6, Math.max(1, Math.round(input.monthsBack ?? 6)))
    return { reportId: input.reportId, params: { monthsBack: n } }
  }
  const month =
    input.month && /^\d{4}-\d{2}$/.test(input.month) ? input.month : currentMonthStr()
  return { reportId: input.reportId, params: { month } }
}

export async function executeReport(
  ctx: TenantContext,
  config: ReportConfig
): Promise<Omit<ReportResult, "source">> {
  // Per-report permission gate — e.g. a fee report refuses without fee:read even
  // if the caller reached the builder via ai:view. 403 (ForbiddenError) otherwise.
  requirePermission(ctx, REPORTS[config.reportId].requiredPermission)

  const instituteId = ctx.institute.id
  let base: ReportBase
  switch (config.reportId) {
    case "fee-collection-trend":
      base = await feeTrend(instituteId, config.params.monthsBack ?? 6)
      break
    case "collection-by-class":
      base = await collectionByClass(instituteId, config.params.month ?? currentMonthStr())
      break
    case "attendance-summary":
      base = await attendanceSummary(instituteId, config.params.month ?? currentMonthStr())
      break
  }
  return { ...base, generatedAt: nowDate().toISOString() }
}

// ─── fee-collection-trend ──────────────────────────────────────────────────────
async function feeTrend(instituteId: string, monthsBack: number): Promise<ReportBase> {
  const overview = await feeMonthlyOverview(instituteId)
  const cur = currentMonthStr()
  const rows = Object.entries(overview.byMonth)
    .map(([k, v]) => {
      const [y, m] = k.split("-")
      return {
        key: `${y}-${m.padStart(2, "0")}`,
        collected: round(v.collected),
        expected: round(v.expected),
      }
    })
    .filter((r) => r.key <= cur)
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-monthsBack)

  const categories = rows.map((r) => formatMonthLabel(r.key))
  const collected = rows.map((r) => r.collected)
  const expected = rows.map((r) => r.expected)
  const totalCollected = sum(collected)
  const totalExpected = sum(expected)
  const rate = totalExpected > 0 ? round((totalCollected / totalExpected) * 100) : 0

  const tableRows: (string | number)[][] = rows.map((r) => [
    formatMonthLabel(r.key),
    r.collected,
    r.expected,
    Math.max(0, r.expected - r.collected),
  ])
  tableRows.push([
    "Total",
    totalCollected,
    totalExpected,
    Math.max(0, totalExpected - totalCollected),
  ])

  const n = rows.length
  return {
    reportId: "fee-collection-trend",
    title: `Fee collection — last ${n} month${n === 1 ? "" : "s"}`,
    configChips: ["Fees", `Last ${n} months`, "Bar"],
    kpis: [
      { label: "Collected", value: totalCollected, format: "currency" },
      { label: "Expected", value: totalExpected, format: "currency" },
      { label: "Collection rate", value: rate, format: "percent" },
    ],
    chart: {
      type: "bar",
      categories,
      valueFormat: "currency",
      series: [
        { name: "Collected", color: REPORT_COLORS.collected, data: collected },
        { name: "Expected", color: REPORT_COLORS.expected, data: expected },
      ],
    },
    table: {
      columns: [
        { label: "Month", format: "text", align: "left" },
        { label: "Collected", format: "currency", align: "right" },
        { label: "Expected", format: "currency", align: "right" },
        { label: "Outstanding", format: "currency", align: "right" },
      ],
      rows: tableRows,
      totalRowIndex: tableRows.length - 1,
    },
    defaultViz: REPORTS["fee-collection-trend"].defaultViz,
  }
}

// ─── collection-by-class ───────────────────────────────────────────────────────
async function collectionByClass(
  instituteId: string,
  month: string
): Promise<ReportBase> {
  const [y, m] = month.split("-").map(Number)
  const classes = await prisma.class.findMany({
    where: { instituteId, status: "ACTIVE" },
    orderBy: [{ name: "asc" }, { section: "asc" }],
    select: { id: true, name: true, section: true },
  })

  // One month summary per class — N small queries, the same numbers the fees
  // month view shows (parity by reuse).
  const summaries = await Promise.all(
    classes.map((c) =>
      feeMonthSummary(instituteId, { periodMonth: m, periodYear: y, classId: c.id })
    )
  )

  const categories = classes.map((c) =>
    c.section ? `${c.name}/${c.section}` : c.name
  )
  const collected = summaries.map((s) => round(s.collectedThisMonth))
  const outstanding = summaries.map((s) => round(s.pendingThisMonth))
  const students = summaries.map((s) => s.totalStudents)

  const tableRows: (string | number)[][] = classes.map((_, i) => [
    categories[i],
    students[i],
    collected[i],
    outstanding[i],
  ])
  tableRows.push(["Total", sum(students), sum(collected), sum(outstanding)])

  return {
    reportId: "collection-by-class",
    title: `Collection by class — ${formatMonthLabel(month)}`,
    configChips: ["Fees", formatMonthLabel(month), "By class"],
    kpis: [
      { label: "Collected", value: sum(collected), format: "currency" },
      { label: "Outstanding", value: sum(outstanding), format: "currency" },
      { label: "Classes", value: classes.length, format: "number" },
    ],
    chart: {
      type: "bar",
      categories,
      valueFormat: "currency",
      series: [
        { name: "Collected", color: REPORT_COLORS.collected, data: collected },
        { name: "Outstanding", color: REPORT_COLORS.outstanding, data: outstanding },
      ],
    },
    table: {
      columns: [
        { label: "Class", format: "text", align: "left" },
        { label: "Students", format: "number", align: "right" },
        { label: "Collected", format: "currency", align: "right" },
        { label: "Outstanding", format: "currency", align: "right" },
      ],
      rows: tableRows,
      totalRowIndex: tableRows.length - 1,
    },
    defaultViz: REPORTS["collection-by-class"].defaultViz,
  }
}

// ─── attendance-summary ────────────────────────────────────────────────────────
async function attendanceSummary(
  instituteId: string,
  month: string
): Promise<ReportBase> {
  const [monthStart, monthEnd] = appMonthBounds(month)
  const students = await prisma.student.findMany({
    where: { instituteId, status: "ACTIVE", archivedAt: null, classId: { not: null } },
    select: {
      id: true,
      classId: true,
      class: { select: { name: true, section: true } },
    },
  })

  type Agg = { name: string; present: number; absent: number; leave: number; students: number }
  const byClass = new Map<string, Agg>()
  const classOf = new Map<string, string>()
  for (const s of students) {
    if (!s.classId) continue
    classOf.set(s.id, s.classId)
    if (!byClass.has(s.classId)) {
      const name = s.class
        ? s.class.section
          ? `${s.class.name}/${s.class.section}`
          : s.class.name
        : "—"
      byClass.set(s.classId, { name, present: 0, absent: 0, leave: 0, students: 0 })
    }
    byClass.get(s.classId)!.students += 1
  }

  const records = students.length
    ? await prisma.attendance.findMany({
        where: {
          instituteId,
          date: { gte: monthStart, lt: monthEnd },
          studentId: { in: students.map((s) => s.id) },
        },
        select: { studentId: true, status: true },
      })
    : []
  for (const r of records) {
    const cid = classOf.get(r.studentId)
    if (!cid) continue
    const a = byClass.get(cid)
    if (!a) continue
    if (r.status === "PRESENT") a.present += 1
    else if (r.status === "ABSENT") a.absent += 1
    else a.leave += 1
  }

  const classesArr = [...byClass.values()].sort((a, b) => a.name.localeCompare(b.name))
  const categories = classesArr.map((c) => c.name)
  const pct = (c: Agg) => {
    const marked = c.present + c.absent + c.leave
    return marked > 0 ? round((c.present / marked) * 100) : 0
  }
  const presentPct = classesArr.map(pct)
  const totalPresent = sum(classesArr.map((c) => c.present))
  const totalMarked = sum(classesArr.map((c) => c.present + c.absent + c.leave))
  const avgPct = totalMarked > 0 ? round((totalPresent / totalMarked) * 100) : 0
  const totalStudents = sum(classesArr.map((c) => c.students))
  const lowClasses = presentPct.filter((p) => p > 0 && p < 80).length

  const tableRows: (string | number)[][] = classesArr.map((c, i) => [
    c.name,
    c.students,
    presentPct[i],
    c.absent,
  ])

  return {
    reportId: "attendance-summary",
    title: `Attendance — ${formatMonthLabel(month)}`,
    configChips: ["Attendance", formatMonthLabel(month), "By class"],
    kpis: [
      { label: "Avg present", value: avgPct, format: "percent" },
      { label: "Students", value: totalStudents, format: "number" },
      { label: "Low-attendance classes", value: lowClasses, format: "number" },
    ],
    chart: {
      type: "bar",
      categories,
      valueFormat: "percent",
      series: [{ name: "Present %", color: REPORT_COLORS.present, data: presentPct }],
    },
    table: {
      columns: [
        { label: "Class", format: "text", align: "left" },
        { label: "Students", format: "number", align: "right" },
        { label: "Present %", format: "percent", align: "right" },
        { label: "Absent", format: "number", align: "right" },
      ],
      rows: tableRows,
      totalRowIndex: null,
    },
    defaultViz: REPORTS["attendance-summary"].defaultViz,
  }
}
