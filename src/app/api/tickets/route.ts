import { created, ok, parseJson, parseQuery, route } from "@/lib/api"
import { can, getTenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ticketCreateSchema, ticketQuerySchema } from "@/features/tickets/schema"
import { createTicket, listMyTickets, listQueue } from "@/features/tickets/service"

// Filing and viewing your own tickets is open to every institute member (like the
// notes board — membership is the only gate). The cross-institute queue is served
// only to the platform super admin.

export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  const params = new URL(req.url).searchParams
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0))
  if (ctx.isSuperAdmin) {
    const filters = parseQuery(params, ticketQuerySchema)
    return ok(await listQueue(filters, offset))
  }
  const isInstituteAdmin = can(ctx, PERMISSIONS.INSTITUTE_MANAGE)
  return ok(await listMyTickets(ctx.institute.id, ctx.user.id, isInstituteAdmin, offset))
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  const input = await parseJson(req, ticketCreateSchema)
  const ticket = await createTicket(ctx.institute.id, ctx.user.id, input)
  return created(ticket)
})
