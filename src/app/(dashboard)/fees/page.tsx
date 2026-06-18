import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { todayInAppTz } from "@/lib/date-helper"
import { feeKeys } from "@/features/fees/api"
import { feeMonthlyOverview, listStudentFees } from "@/features/fees/service"
import { FeesMonthView } from "@/features/fees/components/fees-month-view"

export const metadata: Metadata = { title: "Fees" }

export default async function FeesPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.FEE_READ)

  const canRecord = can(ctx, PERMISSIONS.FEE_RECORD)
  const canWaive = can(ctx, PERMISSIONS.FEE_WAIVE)

  // Prefetch the current IST month's list + overview so the view paints with
  // data. periodMonth/Year are derived in IST to match the browser's default
  // selection (FeesMonthView uses the device's current month).
  const [y, m] = todayInAppTz().split("-").map(Number)
  const qc = makeServerQueryClient()
  await Promise.all([
    qc.prefetchQuery({
      queryKey: feeKeys.list({ periodMonth: m, periodYear: y, pageSize: 100 }),
      queryFn: () =>
        listStudentFees(ctx.institute.id, {
          periodMonth: m,
          periodYear: y,
          page: 1,
          pageSize: 100,
        }),
    }),
    qc.prefetchQuery({
      queryKey: feeKeys.overview(null),
      queryFn: () => feeMonthlyOverview(ctx.institute.id),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <FeesMonthView canRecord={canRecord} canWaive={canWaive} />
    </HydrationBoundary>
  )
}
