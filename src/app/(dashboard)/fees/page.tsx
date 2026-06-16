import type { Metadata } from "next"
import { IndianRupee } from "lucide-react"

import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata: Metadata = { title: "Fees" }

export default async function FeesPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_READ)

  return (
    <ModulePlaceholder
      title="Fees"
      description="Collect payments, track dues, and print receipts."
      icon={IndianRupee}
      features={[
        "Record full and partial payments",
        "Track total, paid, and pending balance",
        "Payment history with notes",
        "Printable fee receipts",
      ]}
    />
  )
}
