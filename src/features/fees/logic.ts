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

export type Period = { year: number; month: number }

export type PaymentPlan = {
  // One entry per month the cash touches, in allocation order.
  allocations: { year: number; month: number; amount: number }[]
  // Shortfall waived on the selected month (0 unless waiveShortfall and a balance remains).
  waiveAmount: number
}

// Distributes a payment across fee months without touching the DB. Rules:
//  1. a NORMAL payment backfills the oldest unpaid month first (admission..now),
//     then prepays forward — so earlier dues clear before later ones;
//  2. a SETTLE-SHORT payment (waiveShortfall) funds the SELECTED month first
//     instead, so its leftover can be waived to close exactly that month;
//  3. prepay upcoming months with any leftover;
//  4. safety net: if nothing could be allocated (e.g. fee=0), keep it on selected;
//  5. settle-short: waive whatever still remains owed on the selected month.
// `paid`/`waived` are keyed `${year}-${month}` with the amounts already on record.
export function planPayment(input: {
  fee: number
  paid: Map<string, number>
  waived: Map<string, number>
  selected: Period
  admission: Period
  now: Period
  amount: number
  waiveShortfall: boolean
}): PaymentPlan {
  const { fee, paid, waived, selected, admission, now, amount, waiveShortfall } = input
  const key = (y: number, m: number) => `${y}-${m}`
  // Working copy so allocations accumulate without mutating the caller's map.
  const paidWork = new Map(paid)
  const dueOf = (y: number, m: number) =>
    Math.max(0, fee - (paidWork.get(key(y, m)) ?? 0) - (waived.get(key(y, m)) ?? 0))

  const order: Period[] = []
  const seen = new Set<string>()
  const queue = (y: number, m: number) => {
    const k = key(y, m)
    if (!seen.has(k)) {
      seen.add(k)
      order.push({ year: y, month: m })
    }
  }
  // Settle-short funds the selected month first so its leftover can be waived;
  // a normal payment just backfills from admission (oldest first).
  if (waiveShortfall) queue(selected.year, selected.month)
  let by = admission.year
  let bm = admission.month
  while (by < now.year || (by === now.year && bm <= now.month)) {
    queue(by, bm)
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

  // 1 + 2: selected month, then outstanding months oldest-first.
  for (const { year, month } of order) {
    if (remaining <= 0) break
    const d = dueOf(year, month)
    if (d > 0) apply(year, month, Math.min(remaining, d))
  }

  // 3: prepay upcoming months with the leftover.
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

  // 4: safety net.
  if (remaining > 0) apply(selected.year, selected.month, remaining)

  // 5: settle-short — whatever's still owed on selected can't over-waive.
  let waiveAmount = 0
  if (waiveShortfall) {
    const shortfall = dueOf(selected.year, selected.month)
    if (shortfall > 0) waiveAmount = shortfall
  }

  return { allocations, waiveAmount }
}
