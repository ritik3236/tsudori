import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ok, created, route, parseJson, parseQuery } from "@/lib/api"
import {
  getAttendanceDay,
  markAttendance,
} from "@/features/attendance/service"
import { dayQuerySchema, markAttendanceSchema } from "@/features/attendance/schema"

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_READ)
  const query = parseQuery(new URL(req.url).searchParams, dayQuerySchema)
  const result = await getAttendanceDay(ctx.institute.id, query.classId, query.date)
  return ok(result)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_MARK)
  const input = await parseJson(req, markAttendanceSchema)
  const record = await markAttendance(ctx.institute.id, input, ctx.user.id)
  return created(record)
})
