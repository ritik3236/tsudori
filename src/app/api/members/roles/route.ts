import { ok, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS, roleWeight } from "@/lib/rbac"
import { listAssignableRoles } from "@/features/members/service"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  // Pass the caller as the grant actor so the dropdown only offers roles they're
  // actually allowed to assign — matching the server-side escalation guard, so
  // the UI never presents a role the grant endpoints would then 403.
  const actor = {
    weight: roleWeight(ctx.membership?.role.key ?? ""),
    permissions: ctx.permissions,
    isSuperAdmin: ctx.isSuperAdmin,
  }
  const roles = await listAssignableRoles(ctx.institute.id, actor)
  return ok(roles)
})
