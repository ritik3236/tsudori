import { noContent, parseJson, route } from "@/lib/api"
import { auth } from "@/lib/auth/server"
import { prisma } from "@/lib/prisma"
import { AppError, ForbiddenError } from "@/lib/errors"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { resetPasswordSchema } from "@/features/members/schema"
import { assertMemberInInstitute, getMember } from "@/features/members/service"
import { recordAudit, AUDIT_ACTIONS } from "@/features/audit/service"

type RouteContext = { params: Promise<{ userId: string }> }

export const POST = route<RouteContext>(async (req, { params }) => {
  const { userId } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  // Setting another user's password goes through Neon Auth's admin plugin, which
  // only authorizes the platform super admin (Better Auth `role === "admin"`).
  // Gate it here too so a non-super-admin gets a clear 403 instead of an opaque
  // upstream rejection.
  if (!ctx.isSuperAdmin) {
    throw new ForbiddenError("Only a platform super admin can reset passwords.")
  }

  const { newPassword } = await parseJson(req, resetPasswordSchema)

  // Keep the super admin's reach scoped to the institute currently in view.
  await assertMemberInInstitute(ctx.institute.id, userId)

  // Forwards the caller's session cookie; Neon Auth re-checks the admin role.
  const { error } = await auth.admin.setUserPassword({ userId, newPassword })
  if (error) {
    throw new AppError(
      error.message || "Couldn't reset the password.",
      typeof error.status === "number" ? error.status : 502,
      "AUTH_ERROR"
    )
  }

  // setUserPassword does NOT invalidate existing sessions, so a compromised
  // session would survive the reset. Eject all of the target's sessions
  // immediately as defense-in-depth.
  const { error: revokeError } = await auth.admin.revokeUserSessions({ userId })
  if (revokeError) {
    throw new AppError(
      revokeError.message || "Couldn't revoke the member's sessions.",
      typeof revokeError.status === "number" ? revokeError.status : 502,
      "AUTH_ERROR"
    )
  }

  const member = await getMember(ctx.institute.id, userId)
  await recordAudit(prisma, {
    instituteId: ctx.institute.id,
    actorId: ctx.user.id,
    action: AUDIT_ACTIONS.MEMBER_PASSWORD_RESET,
    entityType: "Membership",
    entityId: member.membershipId,
    metadata: { userId, memberName: member.name },
  })

  return noContent()
})
