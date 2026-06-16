import { created, ok, parseJson, parseQuery, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { studentCreateSchema, studentQuerySchema } from "@/features/students/schema"
import { createStudent, listStudents } from "@/features/students/service"

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_READ)

  const query = parseQuery(new URL(req.url).searchParams, studentQuerySchema)
  const result = await listStudents(ctx.institute.id, query)
  return ok(result)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_CREATE)

  const input = await parseJson(req, studentCreateSchema)
  const student = await createStudent(ctx.institute.id, input)
  return created(student)
})
