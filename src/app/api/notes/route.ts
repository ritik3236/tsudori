import { created, ok, parseJson, route } from "@/lib/api"
import { can, getTenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { noteCreateSchema } from "@/features/notes/schema"
import { createNote, listNotes } from "@/features/notes/service"

// The note board is open to every institute member — no module permission gate;
// belonging to the tenant (getTenantContext) is the only requirement.

export const GET = route(async () => {
  const ctx = await getTenantContext()
  const isAdmin = can(ctx, PERMISSIONS.INSTITUTE_MANAGE)
  const notes = await listNotes(ctx.institute.id, ctx.user.id, isAdmin)
  return ok(notes)
})

export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  const input = await parseJson(req, noteCreateSchema)
  const note = await createNote(ctx.institute.id, ctx.user.id, input)
  return created(note)
})
