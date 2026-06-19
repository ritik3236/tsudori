// Pure fee calculations — no DB, no "server-only" — so they're unit-testable and
// shared by the service. All money/allocation rules live here.

import type { FeeStatus } from "@/features/fees/types"

// A student's derived status for one month from fee vs paid vs waived. A waiver
// reduces net due; cash beyond net due is advance (credit in hand). A month fully
// settled by waiver alone (no cash) reads as WAIVED rather than PAID.
export function deriveMonth(monthlyFee: number, paid: number, waived: number) {
  const netDue = Math.max(0, monthlyFee - waived)
  const pending = Math.max(0, netDue - paid)
  const advance = Math.max(0, paid - netDue)
  let status: FeeStatus
  if (pending > 0) status = paid > 0 ? "PARTIAL" : "UNPAID"
  else if (advance > 0) status = "ADVANCE"
  else if (paid <= 0 && waived > 0) status = "WAIVED"
  else status = "PAID"
  return { netDue, pending, advance, status }
}

// Two-decimal rounding so money comparisons don't trip on float noise.
const round2 = (n: number) => Math.round(n * 100) / 100

export type ReversalPlan =
  | { ok: true; amount: number }
  | { ok: false; reason: "ALREADY_REVERSED" | "INVALID_AMOUNT" | "EXCEEDS_REMAINING" }

/**
 * Resolves how much of a payment can be reversed. `reversedSoFar` is the total
 * already reversed against it (a positive number). With no `requested` amount it
 * reverses the full remaining balance; otherwise it validates the requested amount
 * fits within what's left. Pure — the service maps a failure to a ValidationError.
 */
export function resolveReversal(
  originalAmount: number,
  reversedSoFar: number,
  requested?: number
): ReversalPlan {
  const remaining = round2(originalAmount - reversedSoFar)
  if (remaining <= 0) return { ok: false, reason: "ALREADY_REVERSED" }
  if (requested == null) return { ok: true, amount: remaining }
  const amount = round2(requested)
  if (!(amount > 0)) return { ok: false, reason: "INVALID_AMOUNT" }
  // Tolerate sub-cent rounding, but never reverse more than is owed back.
  if (amount - remaining > 0.001) return { ok: false, reason: "EXCEEDS_REMAINING" }
  return { ok: true, amount: Math.min(amount, remaining) }
}

export type Period = { year: number; month: number }

export type WaiverPlan = {
  // One entry per outstanding month the waiver clears, oldest first.
  allocations: { year: number; month: number; amount: number }[]
  // Requested amount that couldn't be placed (i.e. exceeds total outstanding).
  unallocated: number
}

// Distributes a concession across outstanding fee months WITHOUT touching the DB.
// Unlike a payment, a waiver can't prepay the future — it only clears real dues,
// so it fills outstanding months oldest-first (admission..now) and stops. Any
// requested amount beyond total outstanding is reported as `unallocated` for the
// caller to reject. `paid`/`waived` are keyed `${year}-${month}`.
export function planWaiver(input: {
  fee: number
  paid: Map<string, number>
  waived: Map<string, number>
  admission: Period
  now: Period
  amount: number
}): WaiverPlan {
  const { fee, paid, waived, admission, now, amount } = input
  const key = (y: number, m: number) => `${y}-${m}`
  const dueOf = (y: number, m: number) =>
    Math.max(0, fee - (paid.get(key(y, m)) ?? 0) - (waived.get(key(y, m)) ?? 0))

  const allocations: WaiverPlan["allocations"] = []
  let remaining = round2(amount)
  let y = admission.year
  let m = admission.month
  while (remaining > 0 && (y < now.year || (y === now.year && m <= now.month))) {
    const d = dueOf(y, m)
    if (d > 0) {
      const take = Math.min(remaining, d)
      allocations.push({ year: y, month: m, amount: round2(take) })
      remaining = round2(remaining - take)
    }
    if (m === 12) {
      y += 1
      m = 1
    } else {
      m += 1
    }
  }
  return { allocations, unallocated: round2(Math.max(0, remaining)) }
}

export type PaymentPlan = {
  // One entry per month the cash touches, in allocation order.
  allocations: { year: number; month: number; amount: number }[]
  // Months waived to clear whatever dues remain after the cash is applied, oldest
  // first. Empty unless waiveRemaining is set (then it settles the student fully).
  waiveAllocations: { year: number; month: number; amount: number }[]
}

// Distributes a payment across fee months without touching the DB. Rules:
//  1. backfill the oldest unpaid month first (admission..now), then prepay forward
//     — so earlier dues clear before later ones;
//  2. safety net: if nothing could be allocated (e.g. fee=0), keep it on selected;
//  3. waiveRemaining: after the cash lands, waive every month still owing so the
//     student is fully settled (a combined pay-and-clear).
// `paid`/`waived` are keyed `${year}-${month}` with the amounts already on record.
export function planPayment(input: {
  fee: number
  paid: Map<string, number>
  waived: Map<string, number>
  selected: Period
  admission: Period
  now: Period
  amount: number
  waiveRemaining: boolean
}): PaymentPlan {
  const { fee, paid, waived, selected, admission, now, amount, waiveRemaining } = input
  const key = (y: number, m: number) => `${y}-${m}`
  // Working copy so allocations accumulate without mutating the caller's map.
  const paidWork = new Map(paid)
  const dueOf = (y: number, m: number) =>
    Math.max(0, fee - (paidWork.get(key(y, m)) ?? 0) - (waived.get(key(y, m)) ?? 0))

  // Billable months, oldest first.
  const order: Period[] = []
  let by = admission.year
  let bm = admission.month
  while (by < now.year || (by === now.year && bm <= now.month)) {
    order.push({ year: by, month: bm })
    bm += 1
    if (bm > 12) {
      bm = 1
      by += 1
    }
  }

  const allocations: PaymentPlan["allocations"] = []
  let remaining = amount
  const apply = (y: number, m: number, amt: number) => {
    allocations.push({ year: y, month: m, amount: amt })
    paidWork.set(key(y, m), (paidWork.get(key(y, m)) ?? 0) + amt)
    remaining -= amt
  }

  // 1: backfill outstanding months oldest-first.
  for (const { year, month } of order) {
    if (remaining <= 0) break
    const d = dueOf(year, month)
    if (d > 0) apply(year, month, Math.min(remaining, d))
  }

  // prepay upcoming months with the leftover.
  let fy = now.year
  let fm = now.month + 1
  if (fm > 12) {
    fm = 1
    fy += 1
  }
  let guard = 0
  while (remaining > 0 && fee > 0 && guard < 600) {
    guard += 1
    const d = dueOf(fy, fm)
    if (d > 0) apply(fy, fm, Math.min(remaining, d))
    fm += 1
    if (fm > 12) {
      fm = 1
      fy += 1
    }
  }

  // 2: safety net.
  if (remaining > 0) apply(selected.year, selected.month, remaining)

  // 3: waive whatever dues remain so the student is fully settled.
  const waiveAllocations: PaymentPlan["waiveAllocations"] = []
  if (waiveRemaining) {
    for (const { year, month } of order) {
      const d = dueOf(year, month)
      if (d > 0) waiveAllocations.push({ year, month, amount: d })
    }
  }

  return { allocations, waiveAllocations }
}
