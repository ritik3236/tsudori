import { ok, parseQuery, route } from "@/lib/api"
import { getTenantContext } from "@/lib/tenant"
import { auditQuerySchema } from "@/features/audit/schema"
import { listAuditLog } from "@/features/audit/service"

// A signed-in user's OWN activity feed. Open to every member — no AUDIT_READ —
// because the actor is forced to the caller server-side, so a user can only ever
// see events they themselves performed. Any client-supplied actorId is ignored.
export const GET = route(async (req) => {
  const ctx = await getTenantContext()

  const query = parseQuery(new URL(req.url).searchParams, auditQuerySchema)
  const result = await listAuditLog(ctx.institute.id, {
    ...query,
    actorId: ctx.user.id,
  })
  return ok(result)
})
