import { ok, route, parseJson } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { setMonthlyBilling } from "@/features/installments/service"
import { switchMonthlySchema } from "@/features/installments/schema"

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_RECORD)
  const { studentId } = await parseJson(req, switchMonthlySchema)
  return ok(await setMonthlyBilling(ctx.institute.id, studentId))
})
