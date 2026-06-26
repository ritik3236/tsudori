import "server-only"

import { can } from "@/lib/tenant"
import type { TenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { todayInAppTz, formatMonthLabel } from "@/lib/date-helper"
import { getDashboardStats } from "@/features/dashboard/service"
import { feeMonthSummary, feeMonthlyOverview } from "@/features/fees/service"
import type { FinanceTrendPoint, InstituteSnapshot } from "./types"

/**
 * The safe data surface for AI features — the only way model-facing code reads
 * institute data. Every field is, by construction:
 *   • scoped to ctx.institute.id (the tenant boundary — no cross-institute leak),
 *   • RBAC-gated (finance is omitted, and never queried, without fee:read),
 *   • anonymized (aggregates only — no student names leave the server).
 *
 * Phase 1 composes one snapshot for the auto-insights summary. Later phases
 * (ask-your-data, anomalies) expose these readers as individual model tools, but
 * the same three guarantees hold for each.
 */
export async function buildInstituteSnapshot(
  ctx: TenantContext
): Promise<InstituteSnapshot> {
  const instituteId = ctx.institute.id
  const canViewFees = can(ctx, PERMISSIONS.FEE_READ)

  // Attendance + active-student count only. includeFinancials:false keeps payment
  // rows (which carry student names) out of the snapshot — even for fee readers,
  // financial figures come from the aggregate-only queries below instead.
  const stats = await getDashboardStats(instituteId, { includeFinancials: false })

  let finance: InstituteSnapshot["finance"] = null
  if (canViewFees) {
    const [summary, overview] = await Promise.all([
      feeMonthSummary(instituteId, {}),
      feeMonthlyOverview(instituteId),
    ])

    // overview.byMonth keys are `${year}-${month}` with an un-padded month
    // (e.g. "2026-6"); normalize to "YYYY-MM" for a stable sort + display label.
    const trend: FinanceTrendPoint[] = Object.entries(overview.byMonth)
      .map(([key, v]) => {
        const [year, month] = key.split("-")
        const sortKey = `${year}-${month.padStart(2, "0")}`
        return {
          sortKey,
          point: {
            month: formatMonthLabel(sortKey),
            collected: v.collected,
            expected: v.expected,
          },
        }
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((x) => x.point)

    finance = {
      month: formatMonthLabel(todayInAppTz().slice(0, 7)),
      collected: summary.collectedThisMonth,
      expected: summary.expectedThisMonth,
      outstanding: summary.pendingThisMonth,
      waived: summary.waivedThisMonth,
      paidStudents: summary.paidCount,
      pendingStudents: summary.pendingCount,
      trend,
    }
  }

  return {
    instituteName: ctx.institute.name,
    currency: ctx.institute.currency,
    activeStudents: stats.totalStudents,
    attendance: {
      date: todayInAppTz(),
      present: stats.attendance.present,
      absent: stats.attendance.absent,
      leave: stats.attendance.leave,
      notMarked: stats.attendance.notMarked,
    },
    finance,
  }
}
