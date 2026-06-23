import { type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const TINT = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
} as const

/** A headline metric tile — shared by the platform dashboard and the institute
 *  detail page so both read identically. */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  sub?: string
  tint: keyof typeof TINT
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <span className={cn("flex size-8 items-center justify-center rounded-lg", TINT[tint])}>
        <Icon className="size-4" />
      </span>
      <p className="mt-2 text-xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
      {sub && <p className="text-muted-foreground/80 mt-0.5 text-[11px]">{sub}</p>}
    </div>
  )
}
