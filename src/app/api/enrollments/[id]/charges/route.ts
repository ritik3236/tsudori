import { created, route, parseJson } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { addOneTimeCharge } from "@/features/enrollment/service"
import { oneTimeChargeSchema } from "@/features/enrollment/schema"

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.ENROLLMENT_MANAGE)
  const input = await parseJson(req, oneTimeChargeSchema)
  return created(await addOneTimeCharge(tenant.institute.id, id, input))
})
