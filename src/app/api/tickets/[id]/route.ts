import { ok, route } from "@/lib/api"
import { getTenantContext } from "@/lib/tenant"
import { ticketTriageSchema } from "@/features/tickets/schema"
import { getTicket, reopenTicket, triageTicket } from "@/features/tickets/service"
import { toTicketViewer } from "@/features/tickets/viewer"

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  return ok(await getTicket(id, toTicketViewer(tenant)))
})

// PATCH carries two intents: a `{ reopen: true }` payload (requester or super
// admin) or a triage payload of status/priority/category (super admin only,
// enforced in the service).
export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  const viewer = toTicketViewer(tenant)

  const raw = await req.json().catch(() => null)
  if (raw && (raw as { reopen?: unknown }).reopen === true) {
    return ok(await reopenTicket(id, viewer))
  }

  const input = ticketTriageSchema.parse(raw)
  return ok(await triageTicket(id, input, viewer))
})
