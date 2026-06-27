import "server-only"

import { generateObject } from "ai"
import { google } from "@ai-sdk/google"

import { AppError } from "@/lib/errors"
import { todayInAppTz } from "@/lib/date-helper"
import { AI_MODEL, isAiConfigured } from "@/features/ai/config"
import { REPORTS } from "./registry"
import { reportConfigAiSchema } from "./schema"
import { resolveReportConfig } from "./service"
import type { ReportConfig } from "./types"

const reportList = (Object.keys(REPORTS) as (keyof typeof REPORTS)[])
  .map((id) => `- "${id}": ${REPORTS[id].description}`)
  .join("\n")

function systemPrompt(): string {
  const today = todayInAppTz()
  return `You convert an institute admin's plain-English request into a report config.
Today is ${today} (current month is ${today.slice(0, 7)}).

Choose exactly ONE reportId and fill ONLY its relevant param:
${reportList}

Params:
- "fee-collection-trend": set monthsBack = number of recent months (1–6, default 6). Do not set month.
- "collection-by-class" and "attendance-summary": set month = "YYYY-MM" (default the current month). Do not set monthsBack.

Pick the closest report to the request. If it's ambiguous, choose "fee-collection-trend".
Never use a reportId outside the list above.`
}

/**
 * Translates a free-text prompt into a validated ReportConfig. The closed enum +
 * Zod schema make an invalid reportId impossible; resolveReportConfig then clamps
 * and defaults the params. No tenant data is sent — only the request text.
 */
export async function generateReportConfig(prompt: string): Promise<ReportConfig> {
  if (!isAiConfigured()) {
    throw new AppError(
      "AI isn't set up yet — add a Gemini API key to enable the report builder.",
      503,
      "AI_UNCONFIGURED"
    )
  }

  try {
    const { object } = await generateObject({
      model: google(AI_MODEL),
      schema: reportConfigAiSchema,
      system: systemPrompt(),
      prompt,
    })
    return resolveReportConfig(object)
  } catch (err) {
    console.error("[reports] config generation failed:", err)
    throw new AppError(
      "Couldn't turn that into a report. Try rephrasing, or pick one of the suggestions.",
      502,
      "AI_PROVIDER_ERROR"
    )
  }
}
