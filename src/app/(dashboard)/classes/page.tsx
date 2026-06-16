import type { Metadata } from "next"
import { Plus } from "lucide-react"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { ClassesTable } from "@/features/classes/components/classes-table"
import { ClassesActions } from "@/features/classes/components/classes-actions"

export const metadata: Metadata = { title: "Classes" }

export default async function ClassesPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.CLASS_READ)

  const canManage = can(ctx, PERMISSIONS.CLASS_MANAGE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Manage class groups and their default monthly fees."
        actions={canManage && <ClassesActions />}
      />
      <ClassesTable canManage={canManage} />
    </div>
  )
}
