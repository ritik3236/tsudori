import { ok, route, parseJson } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { getClass, updateClass } from "@/features/classes/service"
import { classUpdateSchema } from "@/features/classes/schema"

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.CLASS_READ)
  const cls = await getClass(tenant.institute.id, id)
  return ok(cls)
})

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.CLASS_MANAGE)
  const input = await parseJson(req, classUpdateSchema)
  const cls = await updateClass(tenant.institute.id, id, input)
  return ok(cls)
})
