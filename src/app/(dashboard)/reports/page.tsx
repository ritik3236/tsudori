import type { Metadata } from "next"
import { BarChart3 } from "lucide-react"

import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata: Metadata = { title: "Reports" }

export default async function ReportsPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.REPORT_VIEW)

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
