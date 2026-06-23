import { ok, route } from "@/lib/api"
import { ForbiddenError } from "@/lib/errors"
import { getTenantContext } from "@/lib/tenant"
import { listAllInstitutes } from "@/features/institute/service"

// The full list of institutes — for the super admin's switcher / picker only.
// This is a deliberate cross-tenant read, so it's gated on isSuperAdmin (never a
// per-institute permission), keeping the tenant-scoping invariant intact.
export const GET = route(async () => {
  const ctx = await getTenantContext()
  if (!ctx.isSuperAdmin) throw new ForbiddenError()
  return ok(await listAllInstitutes())
})
