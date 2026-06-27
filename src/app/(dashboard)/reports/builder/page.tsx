import type { Metadata } from "next"

import { getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { ReportBuilder } from "@/features/reports/components/report-builder"

export const metadata: Metadata = { title: "Report builder" }

export default async function ReportBuilderPage() {
  const ctx = await getTenantContext()
  // Admin-only, same gate as AI insights. Teachers (report:view, no ai:view)
  // hitting this route get the friendly 403 page.
  requirePagePermission(ctx, PERMISSIONS.AI_VIEW)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report builder"
        description="Describe a report in plain English — AI builds it."
      />
      <div className="max-w-3xl">
        <ReportBuilder />
      </div>
    </div>
  )
}
