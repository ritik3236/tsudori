import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ok, route, parseQuery } from "@/lib/api"
import { getMonthlyReport } from "@/features/attendance/service"
import { reportQuerySchema } from "@/features/attendance/schema"

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_READ)
  const query = parseQuery(new URL(req.url).searchParams, reportQuerySchema)
  const result = await getMonthlyReport(ctx.institute.id, query.classId, query.month)
  return ok(result)
})
