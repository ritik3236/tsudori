import { noContent, ok, parseJson, route } from "@/lib/api"
import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { studentUpdateSchema } from "@/features/students/schema"
import {
  archiveStudent,
  getStudent,
  updateStudent,
} from "@/features/students/service"

type RouteContext = { params: Promise<{ id: string }> }

export const GET = route<RouteContext>(async (_req, { params }) => {
  const { id } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_READ)

  const student = await getStudent(ctx.institute.id, id, {
    includeFinancials: can(ctx, PERMISSIONS.FEE_READ),
  })
  return ok(student)
})

export const PATCH = route<RouteContext>(async (req, { params }) => {
  const { id } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_UPDATE)

  const input = await parseJson(req, studentUpdateSchema)
  const student = await updateStudent(ctx.institute.id, id, input)
  return ok(student)
})

export const DELETE = route<RouteContext>(async (req, { params }) => {
  const { id } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_ARCHIVE)

  const reason = new URL(req.url).searchParams.get("reason")
  await archiveStudent(ctx.institute.id, id, ctx.user.id, reason)
  return noContent()
})
