import { z } from "zod"

import { ok, route, parseJson, parseQuery } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { getInstallmentPlan, saveInstallmentPlan } from "@/features/installments/service"
import { savePlanSchema } from "@/features/installments/schema"

const listQuerySchema = z.object({ studentId: z.string().min(1, "studentId is required.") })

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_READ)
  const { studentId } = parseQuery(new URL(req.url).searchParams, listQuerySchema)
  return ok(await getInstallmentPlan(ctx.institute.id, studentId))
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_RECORD)
  const input = await parseJson(req, savePlanSchema)
  return ok(await saveInstallmentPlan(ctx.institute.id, input.studentId, input))
})
