import { ok, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { getStudentFee } from "@/features/fees/service"

type RouteContext = { params: Promise<{ studentId: string }> }

export const GET = route<RouteContext>(async (_req, { params }) => {
  const { studentId } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_READ)

  const detail = await getStudentFee(ctx.institute.id, studentId)
  return ok(detail)
})
