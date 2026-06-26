import { ok, route, parseJson } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { getCourse, updateCourse } from "@/features/course/service"
import { courseUpdateSchema } from "@/features/course/schema"

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.COURSE_READ)
  const course = await getCourse(tenant.institute.id, id)
  return ok(course)
})

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  requirePermission(tenant, PERMISSIONS.COURSE_MANAGE)
  const input = await parseJson(req, courseUpdateSchema)
  const course = await updateCourse(tenant.institute.id, id, input)
  return ok(course)
})
