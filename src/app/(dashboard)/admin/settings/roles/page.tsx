import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS, roleWeight } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { roleKeys } from "@/features/roles/api"
import { getRolesAndPermissions } from "@/features/roles/service"
import { RolesPermissionsManager } from "@/features/roles/components/roles-permissions-manager"

export const metadata: Metadata = { title: "Roles & permissions" }

export default async function RolesSettingsPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.ROLE_MANAGE)

  const qc = makeServerQueryClient()
  await qc.prefetchQuery({
    queryKey: roleKeys.data(),
    queryFn: () =>
      getRolesAndPermissions(ctx.institute.id, {
        roleId: ctx.membership?.roleId ?? null,
        weight: roleWeight(ctx.membership?.role.key ?? ""),
        permissions: ctx.permissions,
        isSuperAdmin: ctx.isSuperAdmin,
      }),
  })

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink href="/admin/settings" label="Admin" />
        <PageHeader
          title="Roles & permissions"
          description="Control what each role can do across the institute."
        />
      </div>
      <HydrationBoundary state={dehydrate(qc)}>
        <RolesPermissionsManager />
      </HydrationBoundary>
    </div>
  )
}
