import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { classKeys } from "@/features/classes/api"
import { listClasses } from "@/features/classes/service"
import { ClassesTable } from "@/features/classes/components/classes-table"
import { ClassesActions } from "@/features/classes/components/classes-actions"

export const metadata: Metadata = { title: "Classes" }

export default async function ClassesPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.CLASS_READ)

  const canManage = can(ctx, PERMISSIONS.CLASS_MANAGE)

  const qc = makeServerQueryClient()
  await qc.prefetchQuery({
    queryKey: classKeys.lists(),
    queryFn: () => listClasses(ctx.institute.id),
  })

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="space-y-4">
        <ClassesTable canManage={canManage} />
        {canManage && <ClassesActions />}
      </div>
    </HydrationBoundary>
  )
}
