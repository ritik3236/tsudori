import { noContent, parseJson, route } from "@/lib/api"
import { auth } from "@/lib/auth/server"
import { AppError, ForbiddenError } from "@/lib/errors"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { resetPasswordSchema } from "@/features/members/schema"
import { assertMemberInInstitute } from "@/features/members/service"

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

  return noContent()
})
