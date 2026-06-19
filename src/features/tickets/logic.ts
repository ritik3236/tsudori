import type { TicketStatusValue } from "@/features/tickets/schema"

// Pure ticket transition rules — kept out of the DB-bound service so they can be
// unit-tested in isolation.

const DONE_STATUSES: readonly TicketStatusValue[] = ["RESOLVED", "CLOSED"]

/** A ticket is "done" once it's resolved or closed. */
export function isDoneStatus(status: TicketStatusValue): boolean {
  return DONE_STATUSES.includes(status)
}

/**
 * `resolvedAt` records when a ticket FIRST became done (resolved/closed):
 *  - moving into a done state, not yet stamped → stamp `now`
 *  - already stamped and staying done (e.g. RESOLVED → CLOSED) → keep the original
 *  - moving back to a not-done state (reopened) → clear
 *
 * Returns the value `resolvedAt` should hold after a transition to `nextStatus`.
 */
export function nextResolvedAt(
  current: { resolvedAt: Date | null },
  nextStatus: TicketStatusValue,
  now: Date
): Date | null {
  if (isDoneStatus(nextStatus)) return current.resolvedAt ?? now
  return null
}
