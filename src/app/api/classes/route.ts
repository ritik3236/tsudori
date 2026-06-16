import { ok, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { listClassOptions } from "@/features/classes/service"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.CLASS_READ)

  const classes = await listClassOptions(ctx.institute.id)
  return ok(classes)
})
