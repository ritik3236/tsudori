import type { InstallmentStatus } from "@/features/installments/types"

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Split a total into `n` clean 2-dp parts that sum EXACTLY to the total (integer
 * cents, remainder spread one cent at a time so every part is ≥ 0 and within a
 * cent of even). Powers the schedule editor's "split evenly" helper — never
 * last-row-absorb, which can go negative under odd totals.
 */
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return []
  const cents = Math.max(0, Math.round(total * 100))
  const base = Math.floor(cents / n)
  let rem = cents - base * n
  return Array.from({ length: n }, () => {
    const c = base + (rem > 0 ? 1 : 0)
    if (rem > 0) rem -= 1
    return round2(c / 100)
  })
}

/**
 * Per-installment status from its settlement + due date (pure). `nowMs`/`dueMs`
 * are epoch ms; `period`/`now` compare the due MONTH so a current-month installment
 * isn't "overdue" mid-month.
 */
export function installmentStatus(args: {
  amount: number
  paid: number
  waived: number
  dueYear: number
  dueMonth: number
  nowYear: number
  nowMonth: number
}): InstallmentStatus {
  const { amount, paid, waived, dueYear, dueMonth, nowYear, nowMonth } = args
  const outstanding = round2(Math.max(0, amount - paid - waived))
  if (outstanding <= 0) return "PAID" // settled (paid and/or fully waived)
  if (paid > 0 || waived > 0) return "PARTIAL"
  const isFuture = dueYear > nowYear || (dueYear === nowYear && dueMonth > nowMonth)
  if (isFuture) return "UPCOMING"
  const isPast = dueYear < nowYear || (dueYear === nowYear && dueMonth < nowMonth)
  return isPast ? "OVERDUE" : "DUE"
}
