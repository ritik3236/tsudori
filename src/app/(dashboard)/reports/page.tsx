import type { Metadata } from "next"
import Link from "next/link"
import { BarChart3, Sparkles } from "lucide-react"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { InsightsCard } from "@/features/ai/components/insights-card"

export const metadata: Metadata = { title: "Reports" }

export default async function ReportsPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.REPORT_VIEW)

  // AI insights are admin-only (ai:view). Viewers with report:view but not
  // ai:view (e.g. teachers) keep seeing the roadmap placeholder for now.
  if (!can(ctx, PERMISSIONS.AI_VIEW)) {
    return (
      <ModulePlaceholder
        title="Reports"
        description="Export student, attendance, and fee reports."
        icon={BarChart3}
        features={[
          "Student list and attendance reports",
          "Fee collection and outstanding dues reports",
          "Export to PDF and Excel (future-ready interface)",
        ]}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="An AI summary of collections, dues, and attendance for your institute."
        actions={
          <Button variant="outline" size="sm" render={<Link href="/reports/builder" />}>
            <Sparkles className="size-3.5" />
            Report builder
          </Button>
        }
      />
      <div className="max-w-3xl">
        <InsightsCard />
      </div>
    </div>
  )
}
