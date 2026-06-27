import "server-only"

import { todayInAppTz } from "@/lib/date-helper"
import { AI_PRIVACY_MODE } from "./config"
import type { InsightResult } from "./types"

// Daily in-memory cache so the (free-tier) model is called at most once per
// institute per day. Per-instance and ephemeral — lost on redeploy/scale-out —
// which is fine for a daily summary; a durable cache table is a later
// enhancement. Keyed by the app-tz day so it self-rotates without a sweeper.
const store = new Map<string, InsightResult>()

// The key folds the reader's fee:read state (canViewFees): the cached narrative
// differs by it — a fee reader's insights include finance, a non-fee reader's
// don't (buildInstituteSnapshot omits finance without fee:read). Without this a
// finance narrative cached for an admin could be served to a custom
// ai:view-without-fee:read role. Day stays the 2nd segment so eviction can drop
// only prior-day entries while keeping today's per-scope (fin/nofin) variants.
function keyFor(instituteId: string, canViewFees: boolean): string {
  return `${instituteId}:${todayInAppTz()}:${AI_PRIVACY_MODE}:${canViewFees ? "fin" : "nofin"}`
}

export function getCachedInsights(
  instituteId: string,
  canViewFees: boolean
): InsightResult | null {
  return store.get(keyFor(instituteId, canViewFees)) ?? null
}

export function setCachedInsights(
  instituteId: string,
  canViewFees: boolean,
  result: InsightResult
): void {
  const today = todayInAppTz()
  // Evict this institute's stale (previous-day) entries so the map can't grow
  // unbounded as days roll over — but keep today's other-scope variant so a fee
  // reader and a non-fee reader stay independently cached within the same day.
  for (const k of store.keys()) {
    const [keyInstitute, keyDay] = k.split(":")
    if (keyInstitute === instituteId && keyDay !== today) store.delete(k)
  }
  store.set(keyFor(instituteId, canViewFees), result)
}
