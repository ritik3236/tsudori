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
// them. Tints mirror the conventions used across the app (notes board, fee trail).

const chip =
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"

const STATUS_STYLE: Record<TicketStatusValue, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CLOSED: "bg-muted text-muted-foreground",
}

const PRIORITY_STYLE: Record<TicketPriorityValue, string> = {
  URGENT: "bg-rose-600 text-white dark:bg-rose-600 dark:text-white",
  HIGH: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  NORMAL: "bg-muted text-muted-foreground",
  LOW: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
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
    <span className={cn(chip, "bg-muted text-muted-foreground", className)}>
      {CATEGORY_LABELS[category]}
    </span>
  )
}
