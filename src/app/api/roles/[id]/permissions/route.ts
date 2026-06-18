import { ok, parseJson, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS, roleWeight } from "@/lib/rbac"
import { updateRolePermissionsSchema } from "@/features/roles/schema"
import { updateRolePermissions } from "@/features/roles/service"

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.ROLE_MANAGE)

  const input = await parseJson(req, updateRolePermissionsSchema)
  const role = await updateRolePermissions(tenant.institute.id, id, input, {
    roleId: tenant.membership?.roleId ?? null,
    weight: roleWeight(tenant.membership?.role.key ?? ""),
    permissions: tenant.permissions,
    isSuperAdmin: tenant.isSuperAdmin,
  })
  return ok(role)
})
