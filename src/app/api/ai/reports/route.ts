import { ok, parseJson, route } from "@/lib/api"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { reportRequestSchema } from "@/features/reports/schema"
import { generateReportConfig } from "@/features/reports/ai"
import { executeReport, resolveReportConfig } from "@/features/reports/service"

// Builds a report for the active institute. Accepts either { prompt } (AI picks
// the report) or { reportId, ...params } (run a known report directly, no model
// call). Gated on ai:view; each report additionally enforces its own permission.
export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.AI_VIEW)

  const body = await parseJson(req, reportRequestSchema)
  const fromPrompt = "prompt" in body
  const config = fromPrompt
    ? await generateReportConfig(body.prompt)
    : resolveReportConfig(body)

  const result = await executeReport(ctx, config)
  return ok({ ...result, source: fromPrompt ? "ai" : "direct" })
})
