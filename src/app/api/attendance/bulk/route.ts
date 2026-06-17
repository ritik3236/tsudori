import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ok, route, parseJson } from "@/lib/api"
import { markBulkAttendance } from "@/features/attendance/service"
import { bulkMarkSchema } from "@/features/attendance/schema"

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_MARK)
  const input = await parseJson(req, bulkMarkSchema)
  const result = await markBulkAttendance(ctx.institute.id, input, ctx.user.id)
  return ok(result)
})
