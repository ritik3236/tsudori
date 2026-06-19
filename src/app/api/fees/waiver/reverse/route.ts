import { created, parseJson, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { reverseWaiverSchema } from "@/features/fees/schema"
import { reverseWaiver } from "@/features/fees/service"

// Reversing a waiver is gated on fee:waive — whoever can grant a concession can
// undo it. No separate reverse permission/role.
export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_WAIVE)

  const input = await parseJson(req, reverseWaiverSchema)
  const result = await reverseWaiver(ctx.institute.id, ctx.user.id, input)
  return created(result)
})
