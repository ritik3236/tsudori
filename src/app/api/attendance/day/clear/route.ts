import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ok, route, parseJson } from "@/lib/api"
import { clearDayAttendance } from "@/features/attendance/holiday-service"
import { dayActionSchema } from "@/features/attendance/schema"

// Clears all attendance for one day (a class's students, or institute-wide for
// the ALL sentinel) — used to wipe phantom rows when a day is flagged a holiday.
export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_MARK)
  const input = await parseJson(req, dayActionSchema)
  const count = await clearDayAttendance(ctx.institute.id, input.classId, input.date)
  return ok({ count })
})
