import { cn } from "@/lib/utils"
import type { FeeStatus } from "@/features/fees/types"

const STYLES: Record<FeeStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  UNPAID: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  ADVANCE: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  WAIVED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
}

const LABELS: Record<FeeStatus, string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  ADVANCE: "Advance",
  WAIVED: "Waived",
}

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  )
}
