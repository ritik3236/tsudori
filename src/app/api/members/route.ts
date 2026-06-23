import { ok, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { listMembers } from "@/features/members/service"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_READ)

  const members = await listMembers(ctx.institute.id)
  return ok(members)
})
