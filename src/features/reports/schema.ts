import { z } from "zod"

import { REPORT_ID_VALUES } from "./registry"

const reportIdSchema = z.enum(REPORT_ID_VALUES)
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM")
const monthsBackSchema = z.number().int().min(1).max(6)

// The structured output the model must emit — a closed reportId plus the optional
// params. The enum makes an invalid reportId impossible; params are sanity-bounded.
export const reportConfigAiSchema = z.object({
  reportId: reportIdSchema,
  monthsBack: monthsBackSchema.optional(),
  month: monthSchema.optional(),
})
export type ReportConfigAi = z.infer<typeof reportConfigAiSchema>

// The endpoint accepts EITHER a free-text prompt (→ AI picks the report) OR a
// known reportId + params (→ run it directly, no model call). Starter chips use
// the latter so they're instant and free.
export const reportRequestSchema = z.union([
  z.object({ prompt: z.string().trim().min(1).max(500) }),
  z.object({
    reportId: reportIdSchema,
    monthsBack: monthsBackSchema.optional(),
    month: monthSchema.optional(),
  }),
])
export type ReportRequest = z.infer<typeof reportRequestSchema>
