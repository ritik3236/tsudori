import { cn } from "@/lib/utils"
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type TicketCategoryValue,
  type TicketPriorityValue,
  type TicketStatusValue,
} from "@/features/tickets/schema"

// Small uppercase chips for a ticket's status / priority / category. Pure
// presentational (no client hooks) so server and client components can both use
// them. Every combination targets WCAG AA contrast (≈7:1) — the dark text shade
// (800) on the light tint (100) clears AA for the small uppercase type.

const chip =
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"

// Neutral chip for states with no semantic colour (Normal, Closed, categories).
// slate-700 on slate-100 ≈ 8:1 — replaces the old muted-on-muted which failed AA.
const NEUTRAL = "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100"

export const STATUS_STYLE: Record<TicketStatusValue, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  CLOSED: NEUTRAL,
}

export const PRIORITY_STYLE: Record<TicketPriorityValue, string> = {
  URGENT: "bg-rose-600 text-white dark:bg-rose-600 dark:text-white",
  HIGH: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  NORMAL: NEUTRAL,
  LOW: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
}

// Categories carry no semantic colour — all neutral. Exposed as a full map so the
// editable triage chip can share the badge styling.
export const CATEGORY_STYLE: Record<TicketCategoryValue, string> = {
  BUG: NEUTRAL,
  FEATURE: NEUTRAL,
  QUESTION: NEUTRAL,
  BILLING: NEUTRAL,
  OTHER: NEUTRAL,
}

export function StatusBadge({
  status,
  className,
}: {
  status: TicketStatusValue
  className?: string
}) {
  return (
    <span className={cn(chip, STATUS_STYLE[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriorityValue
  className?: string
}) {
  return (
    <span className={cn(chip, PRIORITY_STYLE[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function CategoryBadge({
  category,
  className,
}: {
  category: TicketCategoryValue
  className?: string
}) {
  return (
    <span className={cn(chip, NEUTRAL, className)}>{CATEGORY_LABELS[category]}</span>
  )
}
