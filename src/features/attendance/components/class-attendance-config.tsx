"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import { WEEKDAY_LABELS, WEEKDAYS_IN_ORDER } from "@/lib/working-day"
import { useAttendanceConfig } from "@/features/attendance/hooks"
import { useUpdateClass } from "@/features/classes/hooks"
import { HolidayManager } from "@/features/attendance/components/holiday-manager"
import { Button } from "@/components/ui/button"
import type { ClassListItem } from "@/features/classes/types"

function labelDays(days: number[]): string {
  return days.length ? days.map((d) => WEEKDAY_LABELS[d]).join(", ") : "None"
}

export function ClassAttendanceConfig({ cls }: { cls: ClassListItem }) {
  return (
    <div className="bg-card space-y-6 rounded-xl border p-4">
      <div>
        <h2 className="text-base font-semibold">Attendance</h2>
        <p className="text-muted-foreground text-sm">
          Weekly off and holidays for this class. Anything left unset follows the
          institute.
        </p>
      </div>
      <ClassWeeklyOff classId={cls.id} initial={cls.weeklyOffOverride} />
      <div className="space-y-2.5">
        <h3 className="text-sm font-medium">Class holidays</h3>
        <HolidayManager classId={cls.id} />
      </div>
    </div>
  )
}

function ClassWeeklyOff({
  classId,
  initial,
}: {
  classId: string
  initial: number[] | null
}) {
  const { data: cfg } = useAttendanceConfig()
  const update = useUpdateClass(classId)
  const [override, setOverride] = useState<number[] | null>(initial)

  const instituteDefault = cfg?.weeklyOff ?? []
  const isCustom = override !== null

  const save = (next: number[] | null) => {
    setOverride(next)
    update.mutate({ weeklyOffOverride: next })
  }

  const toggleDay = (day: number) => {
    if (override === null) return
    const next = override.includes(day)
      ? override.filter((d) => d !== day)
      : [...override, day].sort((a, b) => a - b)
    save(next)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Weekly off</h3>
        {isCustom ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => save(null)}
            disabled={update.isPending}
          >
            Reset to institute
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => save([...instituteDefault])}
            disabled={update.isPending}
          >
            Set custom
          </Button>
        )}
      </div>

      {isCustom ? (
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS_IN_ORDER.map((day) => {
            const on = override!.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                disabled={update.isPending}
                aria-pressed={on}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                  on
                    ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                    : "hover:bg-muted"
                )}
              >
                {WEEKDAY_LABELS[day]}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Inherits institute weekly off:{" "}
          <span className="text-foreground font-medium">{labelDays(instituteDefault)}</span>
        </p>
      )}
    </div>
  )
}
