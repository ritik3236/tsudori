import { ok, parseJson, route } from "@/lib/api"
import { auth } from "@/lib/auth/server"
import { AppError, ForbiddenError } from "@/lib/errors"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { banMemberSchema } from "@/features/members/schema"
import { assertMemberInInstitute, getMember } from "@/features/members/service"

type RouteContext = { params: Promise<{ userId: string }> }

function toAppError(error: { message?: string; status?: number }, fallback: string) {
  return new AppError(
    error.message || fallback,
    typeof error.status === "number" ? error.status : 502,
    "AUTH_ERROR"
  )
}

// Banning is a Neon Auth admin-plugin operation, so it requires the platform
// super admin and is scoped to a member of the institute in view.
export const POST = route<RouteContext>(async (req, { params }) => {
  const { userId } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  if (!ctx.isSuperAdmin) {
    throw new ForbiddenError("Only a platform super admin can ban members.")
  }
  if (userId === ctx.user.id) {
    throw new ForbiddenError("You can't ban your own account.")
  }

  await assertMemberInInstitute(ctx.institute.id, userId)
  const { reason } = await parseJson(req, banMemberSchema)

  const { error } = await auth.admin.banUser({
    userId,
    ...(reason ? { banReason: reason } : {}),
  })
  if (error) throw toAppError(error, "Couldn't ban the member.")

  const member = await getMember(ctx.institute.id, userId)
  return ok(member)
})

export const DELETE = route<RouteContext>(async (_req, { params }) => {
  const { userId } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  if (!ctx.isSuperAdmin) {
    throw new ForbiddenError("Only a platform super admin can unban members.")
  }

  await assertMemberInInstitute(ctx.institute.id, userId)

  const { error } = await auth.admin.unbanUser({ userId })
  if (error) throw toAppError(error, "Couldn't unban the member.")

  const member = await getMember(ctx.institute.id, userId)
  return ok(member)
})
