import { ok, parseQuery, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { feeSummaryQuerySchema } from "@/features/fees/schema"
import { feeMonthSummary } from "@/features/fees/service"

// Month dashboard totals (collected/expected/outstanding + paid/pending counts)
// for the selected month + class. Separate from the paged list so it's computed
// once per month/class, not on every infinite-scroll page.
export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.FEE_READ)
  const query = parseQuery(new URL(req.url).searchParams, feeSummaryQuerySchema)
  return ok(await feeMonthSummary(ctx.institute.id, query))
})
