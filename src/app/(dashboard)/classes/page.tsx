import type { Metadata } from "next"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ClassesTable } from "@/features/classes/components/classes-table"
import { ClassesActions } from "@/features/classes/components/classes-actions"

export const metadata: Metadata = { title: "Classes" }

export default async function ClassesPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.CLASS_READ)

  const canManage = can(ctx, PERMISSIONS.CLASS_MANAGE)

  return (
    <div className="space-y-4">
      <ClassesTable canManage={canManage} />
      {canManage && <ClassesActions />}
    </div>
  )
}
