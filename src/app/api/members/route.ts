import { created, ok, parseJson, route } from "@/lib/api"
import { auth } from "@/lib/auth/server"
import { AppError, ConflictError, ForbiddenError } from "@/lib/errors"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { memberCreateSchema } from "@/features/members/schema"
import {
  addMembership,
  assertRoleInInstitute,
  listMembers,
} from "@/features/members/service"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_READ)

  const members = await listMembers(ctx.institute.id)
  return ok(members)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_MANAGE)

  // Creating a Neon Auth identity goes through the admin plugin, which only
  // authorizes the platform super admin (Better Auth `role === "admin"`).
  if (!ctx.isSuperAdmin) {
    throw new ForbiddenError("Only a platform super admin can add members.")
  }

  const input = await parseJson(req, memberCreateSchema)

  // Validate the role up front so we don't create an orphaned identity if it's bad.
  await assertRoleInInstitute(ctx.institute.id, input.roleId)

  // 1) Identity. Forwards the caller's session; Neon Auth re-checks the admin role.
  const { data, error } = await auth.admin.createUser({
    email: input.email,
    name: input.name,
    password: input.password,
  })
  if (error) {
    if (/exist/i.test(error.message || "")) {
      throw new ConflictError("A user with that email already exists.")
    }
    throw new AppError(
      error.message || "Couldn't create the member.",
      typeof error.status === "number" ? error.status : 502,
      "AUTH_ERROR"
    )
  }

  // 2) Institute membership + role.
  const member = await addMembership(ctx.institute.id, data.user.id, input.roleId)
  return created(member)
})
