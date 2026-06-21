import { ok, parseQuery, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { auditQuerySchema } from "@/features/audit/schema"
import { listAuditLog } from "@/features/audit/service"

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.AUDIT_READ)

  const query = parseQuery(new URL(req.url).searchParams, auditQuerySchema)
  const result = await listAuditLog(ctx.institute.id, query)
  return ok(result)
})
