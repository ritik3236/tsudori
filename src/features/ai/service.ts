import "server-only"

import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

import { can } from "@/lib/tenant"
import type { TenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { AppError } from "@/lib/errors"
import { nowDate } from "@/lib/date-helper"
import { AI_MODEL, AI_MODEL_LABEL, isAiConfigured } from "./config"
import { buildInstituteSnapshot } from "./data"
import { getCachedInsights, setCachedInsights } from "./cache"
import type { InsightResult } from "./types"

// Structured output contract. generateObject forces the model to return exactly
// this shape (validated), so the UI never has to parse free-form text.
const insightObjectSchema = z.object({
  headline: z
    .string()
    .describe("One sentence (≤ ~14 words) summarizing the institute's current state."),
  insights: z
    .array(
      z.object({
        title: z.string().describe("A short label, ≤ ~6 words."),
        detail: z
          .string()
          .describe("One or two sentences explaining the point, citing the snapshot's numbers."),
        tone: z
          .enum(["positive", "attention", "neutral"])
          .describe("positive = good news, attention = act on this, neutral otherwise."),
      })
    )
    .min(2)
    .max(5),
})

const SYSTEM_PROMPT = `You are an analyst for a school / coaching-institute admin dashboard in India.
You receive a JSON snapshot of one institute's current figures (currency is INR; amounts are whole rupees).
Write a brief, plain-English insights summary an administrator can read at a glance.

Rules:
- Use ONLY the numbers in the snapshot. Never invent figures, names, or trends that aren't present.
- Do not perform unstated arithmetic. If month-on-month values are needed, they are already in the trend.
- Be specific and reference the real numbers, but keep each insight to 1–2 sentences.
- Prioritise what an admin should act on: outstanding dues, collected vs expected, attendance gaps, month-on-month movement.
- If financial data is absent (the viewer lacks permission), focus on attendance and enrolment only — do not mention money.`

/** Generates a fresh insights set from the model and caches it for the day. */
export async function generateInsights(ctx: TenantContext): Promise<InsightResult> {
  if (!isAiConfigured()) {
    throw new AppError(
      "AI insights aren't set up yet — add a Gemini API key to enable them.",
      503,
      "AI_UNCONFIGURED"
    )
  }

  const canViewFees = can(ctx, PERMISSIONS.FEE_READ)
  const snapshot = await buildInstituteSnapshot(ctx)

  let object: z.infer<typeof insightObjectSchema>
  try {
    ;({ object } = await generateObject({
      model: google(AI_MODEL),
      schema: insightObjectSchema,
      system: SYSTEM_PROMPT,
      prompt: `Institute snapshot:\n${JSON.stringify(snapshot, null, 2)}`,
    }))
  } catch (err) {
    console.error("[ai] insight generation failed:", err)
    throw new AppError(
      "Couldn't generate insights right now. Please try again in a moment.",
      502,
      "AI_PROVIDER_ERROR"
    )
  }

  const result: InsightResult = {
    headline: object.headline,
    insights: object.insights,
    generatedAt: nowDate().toISOString(),
    model: AI_MODEL_LABEL,
    cached: false,
  }
  setCachedInsights(ctx.institute.id, canViewFees, result)
  return result
}

/** Returns today's cached insights if present, otherwise generates + caches. */
export async function getInsights(
  ctx: TenantContext,
  opts: { refresh?: boolean } = {}
): Promise<InsightResult> {
  if (!opts.refresh) {
    const cached = getCachedInsights(ctx.institute.id, can(ctx, PERMISSIONS.FEE_READ))
    if (cached) return { ...cached, cached: true }
  }
  return generateInsights(ctx)
}
