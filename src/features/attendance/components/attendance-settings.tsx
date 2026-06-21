"use client"

import { cn } from "@/lib/utils"
import { WEEKDAY_LABELS, WEEKDAYS_IN_ORDER } from "@/lib/working-day"
import { useAttendanceConfig, useSaveWeeklyOff } from "@/features/attendance/hooks"
import { HolidayManager } from "@/features/attendance/components/holiday-manager"
import { Skeleton } from "@/components/ui/skeleton"

export function AttendanceSettings() {
  return (
    <div className="space-y-8">
      <WeeklyOffSection />
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Holidays</h2>
          <p className="text-muted-foreground text-sm">
            Public or custom closures, plus one-off working days that override the weekly
            off (e.g. an extra class on a Sunday).
          </p>
        </div>
        <HolidayManager />
      </section>
    </div>
  )
}

function WeeklyOffSection() {
  const { data, isLoading } = useAttendanceConfig()
  const save = useSaveWeeklyOff()
  const weeklyOff = data?.weeklyOff ?? []

  const toggle = (day: number) => {
    const next = weeklyOff.includes(day)
      ? weeklyOff.filter((d) => d !== day)
      : [...weeklyOff, day].sort((a, b) => a - b)
    save.mutate(next)
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Weekly off</h2>
        <p className="text-muted-foreground text-sm">
          Days the institute is closed every week. Attendance can&apos;t be marked on
          these unless you hold an extra class for the day.
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-9 w-full max-w-sm" />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS_IN_ORDER.map((day) => {
            const on = weeklyOff.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggle(day)}
                disabled={save.isPending}
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
      )}
    </section>
  )
}
