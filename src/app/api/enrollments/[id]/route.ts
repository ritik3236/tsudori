import { ok, route, parseJson } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { updateEnrollment } from "@/features/enrollment/service"
import { enrollmentUpdateSchema } from "@/features/enrollment/schema"

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.ENROLLMENT_MANAGE)
  const input = await parseJson(req, enrollmentUpdateSchema)
  return ok(await updateEnrollment(tenant.institute.id, id, input))
})
