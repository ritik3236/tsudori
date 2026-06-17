import { ok, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS, roleWeight } from "@/lib/rbac"
import { getRolesAndPermissions } from "@/features/roles/service"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  const data = await getRolesAndPermissions(ctx.institute.id, {
    roleId: ctx.membership?.roleId ?? null,
    weight: roleWeight(ctx.membership?.role.key ?? ""),
    permissions: ctx.permissions,
    isSuperAdmin: ctx.isSuperAdmin,
  })
  return ok(data)
})
