import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ok, route, parseJson } from "@/lib/api"
import {
  getInstituteWeeklyOff,
  saveInstituteWeeklyOff,
} from "@/features/attendance/holiday-service"
import { weeklyOffSchema } from "@/features/attendance/schema"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_READ)
  const weeklyOff = await getInstituteWeeklyOff(ctx.institute.id)
  return ok({ weeklyOff })
})

export const PATCH = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_CONFIGURE)
  const input = await parseJson(req, weeklyOffSchema)
  await saveInstituteWeeklyOff(ctx.institute.id, input.weeklyOff)
  return ok({ weeklyOff: input.weeklyOff })
})
