import { created, parseJson, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { reverseFeeSchema } from "@/features/fees/schema"
import { reversePayment } from "@/features/fees/service"

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_REVERSE)

  const input = await parseJson(req, reverseFeeSchema)
  const result = await reversePayment(ctx.institute.id, ctx.user.id, input)
  return created(result)
})
