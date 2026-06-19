import { created, ok, parseJson, parseQuery, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { feeQuerySchema, recordPaymentSchema } from "@/features/fees/schema"
import { listStudentFees, recordPayment } from "@/features/fees/service"

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_READ)

  const query = parseQuery(new URL(req.url).searchParams, feeQuerySchema)
  const result = await listStudentFees(ctx.institute.id, query)
  return ok(result)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_RECORD)

  const input = await parseJson(req, recordPaymentSchema)
  // Waiving dues is a higher bar than just taking cash.
  if (input.waiveRemaining) requirePermission(ctx, PERMISSIONS.FEE_WAIVE)
  const result = await recordPayment(ctx.institute.id, ctx.user.id, input)
  return created(result)
})
