import { ok, created, route, parseJson } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { listCourses, createCourse } from "@/features/course/service"
import { courseCreateSchema } from "@/features/course/schema"

export const GET = route(async () => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.COURSE_READ)
  const courses = await listCourses(ctx.institute.id)
  return ok(courses)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.COURSE_MANAGE)
  const input = await parseJson(req, courseCreateSchema)
  const course = await createCourse(ctx.institute.id, input)
  return created(course)
})
