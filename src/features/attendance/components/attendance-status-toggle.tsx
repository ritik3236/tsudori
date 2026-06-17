"use client"

import { cn } from "@/lib/utils"
import type { AttendanceStatus } from "@/features/attendance/types"

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; active: string }
> = {
  PRESENT: {
    label: "P",
    active: "bg-green-100 text-green-700 border-green-300",
  },
  ABSENT: {
    label: "A",
    active: "bg-red-100 text-red-700 border-red-300",
  },
  LEAVE: {
    label: "L",
    active: "bg-amber-100 text-amber-700 border-amber-300",
  },
}

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LEAVE"]

type Props = {
  value: AttendanceStatus | null
  onChange: (status: AttendanceStatus) => void
  disabled?: boolean
}

export function AttendanceStatusToggle({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-1">
      {STATUSES.map((status) => {
        const cfg = STATUS_CONFIG[status]
        const active = value === status
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(status)
            }}
            className={cn(
              "h-8 w-8 rounded-md border text-xs font-semibold transition-colors",
              active
                ? cfg.active
                : "border-border bg-background text-muted-foreground hover:bg-muted",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}
