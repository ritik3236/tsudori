import { created, parseJson, route } from "@/lib/api"
import { can, getTenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { noteCommentCreateSchema } from "@/features/notes/schema"
import { addNoteComment } from "@/features/notes/service"

// Open to every institute member — replying needs no module permission, just
// tenant membership (same as posting a note).
export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  const isAdmin = can(tenant, PERMISSIONS.INSTITUTE_MANAGE)
  const input = await parseJson(req, noteCommentCreateSchema)
  // Returns the refreshed note (with the new reply) so the client can seed its
  // cache without a second round trip.
  return created(
    await addNoteComment(tenant.institute.id, tenant.user.id, isAdmin, id, input)
  )
})
