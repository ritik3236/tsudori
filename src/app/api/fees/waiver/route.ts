import { created, parseJson, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { waiveFeeSchema } from "@/features/fees/schema"
import { recordWaiver } from "@/features/fees/service"

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_WAIVE)

  const input = await parseJson(req, waiveFeeSchema)
  const result = await recordWaiver(ctx.institute.id, ctx.user.id, input)
  return created(result)
})
