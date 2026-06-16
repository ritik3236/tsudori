import { ok, created, route, parseJson } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { listClasses, createClass } from "@/features/classes/service"
import { classCreateSchema } from "@/features/classes/schema"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.CLASS_READ)
  const classes = await listClasses(ctx.institute.id)
  return ok(classes)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.CLASS_MANAGE)
  const input = await parseJson(req, classCreateSchema)
  const cls = await createClass(ctx.institute.id, input)
  return created(cls)
})
