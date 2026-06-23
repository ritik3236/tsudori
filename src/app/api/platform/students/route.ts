import { ok, parseQuery, route } from "@/lib/api"
import { getSuperAdminContext } from "@/lib/tenant"
import { platformStudentQuerySchema } from "@/features/platform/schema"
import { listPlatformStudents } from "@/features/platform/service"

// Cross-tenant student directory. getSuperAdminContext() throws ForbiddenError
// for anyone but the platform super admin → route() maps it to 403.
export const GET = route(async (req) => {
  const ctx = await getSuperAdminContext()
  const query = parseQuery(new URL(req.url).searchParams, platformStudentQuerySchema)
  const result = await listPlatformStudents(ctx, query)
  return ok(result)
})
