import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ok, route, parseJson } from "@/lib/api"
import { upsertHoliday } from "@/features/attendance/holiday-service"
import { dayActionSchema } from "@/features/attendance/schema"

// "Hold class today" — forces a non-working day open for one class (or institute-
// wide when classId is the ALL sentinel) by writing a WORKING override. Part of
// the marking workflow, so it's gated on attendance:mark, not :configure.
export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_MARK)
  const input = await parseJson(req, dayActionSchema)
  const item = await upsertHoliday(
    ctx.institute.id,
    { classId: input.classId, date: input.date, kind: "WORKING" },
    ctx.user.id
  )
  return ok(item)
})
