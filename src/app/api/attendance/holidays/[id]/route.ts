import { ok, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { deleteHoliday } from "@/features/attendance/holiday-service"

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.ATTENDANCE_CONFIGURE)
  await deleteHoliday(tenant.institute.id, id)
  return ok({ id })
})
