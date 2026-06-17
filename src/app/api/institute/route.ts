import { ok, parseJson, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { instituteUpdateSchema } from "@/features/institute/schema"
import { updateInstitute } from "@/features/institute/service"

export const PATCH = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.INSTITUTE_MANAGE)

  const input = await parseJson(req, instituteUpdateSchema)
  const profile = await updateInstitute(ctx.institute.id, input)
  return ok(profile)
})
