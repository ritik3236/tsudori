import { ok, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { feeMonthlyOverview } from "@/features/fees/service"

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_READ)

  const classId = new URL(req.url).searchParams.get("classId") || undefined
  const overview = await feeMonthlyOverview(ctx.institute.id, classId)
  return ok(overview)
})
