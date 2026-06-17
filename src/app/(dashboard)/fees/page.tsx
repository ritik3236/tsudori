import type { Metadata } from "next"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { FeesMonthView } from "@/features/fees/components/fees-month-view"

export const metadata: Metadata = { title: "Fees" }

export default async function FeesPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_READ)

  const canRecord = can(ctx, PERMISSIONS.FEE_RECORD)

  return <FeesMonthView canRecord={canRecord} />
}
