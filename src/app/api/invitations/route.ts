import { created, parseJson, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { inviteCreateSchema } from "@/features/invitations/schema"
import { createInvitation } from "@/features/invitations/service"

// Create an invite link. Anyone with member:manage (Institute Admin, super admin)
// can invite — no platform-admin identity API needed.
export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  const input = await parseJson(req, inviteCreateSchema)
  const { token } = await createInvitation(ctx.institute.id, ctx.user.id, input)
  return created({ token })
})
