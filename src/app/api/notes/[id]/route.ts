import { noContent, ok, parseJson, route } from "@/lib/api"
import { can, getTenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { noteUpdateSchema } from "@/features/notes/schema"
import { deleteNote, updateNote } from "@/features/notes/service"

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  const isAdmin = can(tenant, PERMISSIONS.INSTITUTE_MANAGE)
  const input = await parseJson(req, noteUpdateSchema)
  const note = await updateNote(tenant.institute.id, tenant.user.id, isAdmin, id, input)
  return ok(note)
})

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const tenant = await getTenantContext()
  const isAdmin = can(tenant, PERMISSIONS.INSTITUTE_MANAGE)
  await deleteNote(tenant.institute.id, tenant.user.id, isAdmin, id)
  return noContent()
})
