import "server-only"

import { todayInAppTz } from "@/lib/date-helper"
import { AI_PRIVACY_MODE } from "./config"
import type { InsightResult } from "./types"

// Daily in-memory cache so the (free-tier) model is called at most once per
// institute per day. Per-instance and ephemeral — lost on redeploy/scale-out —
// which is fine for a daily summary; a durable cache table is a later
// enhancement. Keyed by the app-tz day so it self-rotates without a sweeper.
const store = new Map<string, InsightResult>()

function keyFor(instituteId: string): string {
  return `${instituteId}:${todayInAppTz()}:${AI_PRIVACY_MODE}`
}

export function getCachedInsights(instituteId: string): InsightResult | null {
  return store.get(keyFor(instituteId)) ?? null
}

export function setCachedInsights(instituteId: string, result: InsightResult): void {
  const today = keyFor(instituteId)
  // Evict this institute's stale (previous-day) entries so the map can't grow
  // unbounded as days roll over.
  for (const k of store.keys()) {
    if (k.startsWith(`${instituteId}:`) && k !== today) store.delete(k)
  }
  store.set(today, result)
}
