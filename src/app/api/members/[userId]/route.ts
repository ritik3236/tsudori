import { noContent, ok, parseJson, route } from "@/lib/api"
import { ForbiddenError } from "@/lib/errors"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { memberUpdateSchema } from "@/features/members/schema"
import { removeMember, restoreMember, updateMemberRole } from "@/features/members/service"

type RouteContext = { params: Promise<{ userId: string }> }

export const PATCH = route<RouteContext>(async (req, { params }) => {
  const { userId } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  // Guard against self-demotion locking the actor out of their own access.
  if (userId === ctx.user.id) {
    throw new ForbiddenError("You can't change your own role.")
  }

  const { roleId, reason } = await parseJson(req, memberUpdateSchema)
  const member = await updateMemberRole(ctx.institute.id, userId, roleId, ctx.user.id, reason)
  return ok(member)
})

export const DELETE = route<RouteContext>(async (req, { params }) => {
  const { userId } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  if (userId === ctx.user.id) {
    throw new ForbiddenError("You can't remove your own account.")
  }

  const reason = new URL(req.url).searchParams.get("reason")
  await removeMember(ctx.institute.id, userId, ctx.user.id, reason)
  return noContent()
})

// Restore a previously removed (suspended) member back to active.
export const POST = route<RouteContext>(async (_req, { params }) => {
  const { userId } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  const member = await restoreMember(ctx.institute.id, userId, ctx.user.id)
  return ok(member)
})
