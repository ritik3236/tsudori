import { z } from "zod"

import { ok, parseQuery, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { getInsights } from "@/features/ai/service"

const querySchema = z.object({
  refresh: z.enum(["1", "true"]).optional(),
})

// AI-generated report insights for the active institute. Cached per institute
// per day; ?refresh=1 forces a regenerate. Gated on ai:view (admins only).
export const GET = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.AI_VIEW)
  const { refresh } = parseQuery(new URL(req.url).searchParams, querySchema)
  return ok(await getInsights(ctx, { refresh: Boolean(refresh) }))
})
