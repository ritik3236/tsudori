import { created, parseJson, route } from "@/lib/api"
import { getTenantContext } from "@/lib/tenant"
import { commentCreateSchema } from "@/features/tickets/schema"
import { addComment } from "@/features/tickets/service"
import { toTicketViewer } from "@/features/tickets/viewer"

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  const input = await parseJson(req, commentCreateSchema)
  // Returns the refreshed ticket detail (with the new comment) so the client can
  // seed its cache without a second round trip.
  return created(await addComment(id, input, toTicketViewer(tenant)))
})
