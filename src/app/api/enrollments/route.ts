import { z } from "zod"

import { ok, created, route, parseJson, parseQuery } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { listEnrollments, createEnrollment } from "@/features/enrollment/service"
import { enrollmentCreateSchema } from "@/features/enrollment/schema"

const listQuerySchema = z.object({ studentId: z.string().min(1, "studentId is required.") })

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ENROLLMENT_READ)
  const { studentId } = parseQuery(new URL(req.url).searchParams, listQuerySchema)
  return ok(await listEnrollments(ctx.institute.id, studentId))
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ENROLLMENT_MANAGE)
  const input = await parseJson(req, enrollmentCreateSchema)
  return created(await createEnrollment(ctx.institute.id, input))
})
