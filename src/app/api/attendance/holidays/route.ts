import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ok, created, route, parseJson, parseQuery } from "@/lib/api"
import { listHolidays, upsertHoliday } from "@/features/attendance/holiday-service"
import { holidayQuerySchema, holidayUpsertSchema } from "@/features/attendance/schema"

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_READ)
  const q = parseQuery(new URL(req.url).searchParams, holidayQuerySchema)
  const items = await listHolidays(ctx.institute.id, { month: q.month, classId: q.classId })
  return ok(items)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_CONFIGURE)
  const input = await parseJson(req, holidayUpsertSchema)
  const item = await upsertHoliday(ctx.institute.id, input, ctx.user.id)
  return created(item)
})
