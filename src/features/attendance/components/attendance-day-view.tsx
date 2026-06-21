"use client"

import { useEffect, useRef } from "react"
import { CalendarOff, Users } from "lucide-react"
import { toast } from "sonner"

import { formatDateLong } from "@/lib/format"
import { formatWeekdayLong } from "@/lib/date-helper"
import {
  attendanceAbsenceMessage,
  toWhatsAppNumber,
  whatsappUrl,
  WhatsAppIconLink,
} from "@/lib/whatsapp"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { AttendanceStatusToggle } from "./attendance-status-toggle"
import {
  useAttendanceDay,
  useClearDay,
  useHoldClass,
  useMarkAttendance,
  useMarkBulkAttendance,
} from "@/features/attendance/hooks"
import type { AttendanceStatus, WorkingDay } from "@/features/attendance/types"

type Props = {
  classId: string
  date: string
  canMark: boolean
  instituteName: string
}

/** Human label for why a day is closed. */
function holidayTitle(workingDay: WorkingDay): string {
  if (workingDay.reason === "weekly-off") return "Weekly holiday"
  return workingDay.name ?? "Holiday"
}

export function AttendanceDayView({ classId, date, canMark, instituteName }: Props) {
  const { data, isLoading } = useAttendanceDay(classId, date)
  const mark = useMarkAttendance(classId, date)
  const markBulk = useMarkBulkAttendance(classId, date)
  const holdClass = useHoldClass(classId, date)
  const clearDay = useClearDay(classId, date)

  const isWorkingDay = data?.workingDay.working ?? true

  // Auto-mark all unmarked students as Present when the day loads for the first
  // time — but NEVER on a non-working day (that's what manufactured the phantom
  // Sunday attendance). Teachers only need to change who is Absent or on Leave.
  const autoMarked = useRef(new Set<string>())
  useEffect(() => {
    if (!canMark || !data || !data.workingDay.working) return
    const key = `${data.classId}:${data.date}`
    if (autoMarked.current.has(key)) return
    autoMarked.current.add(key)
    const unmarked = data.students.filter((s) => s.status === null)
    if (unmarked.length === 0) return
    markBulk.mutate(
      {
        classId: data.classId,
        date: data.date,
        records: unmarked.map((s) => ({ studentId: s.studentId, status: "PRESENT" as const })),
      },
      { onSuccess: () => {} } // auto-mark is silent; no toast
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  function handleMark(studentId: string, status: AttendanceStatus) {
    mark.mutate({ studentId, date, status })
  }

  function handleMarkAll(status: AttendanceStatus) {
    if (!data?.students.length) return
    markBulk.mutate(
      {
        classId,
        date,
        records: data.students.map((s) => ({ studentId: s.studentId, status })),
      },
      { onSuccess: () => toast.success("Attendance saved.") }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-3.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-8 w-28" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) return null

  const { students, summary, workingDay } = data
  const markedCount = summary.present + summary.absent + summary.leave

  // ── Holiday: no auto-mark, no marking grid. Offer to open the day or clear any
  //    phantom records left from before holidays existed. ──
  if (!isWorkingDay) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <CalendarOff className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {holidayTitle(workingDay)}
              </p>
              <p className="mt-0.5 text-sm text-amber-800/90 dark:text-amber-200/80">
                {`${formatWeekdayLong(date)} is not a working day — attendance isn’t taken.`}
              </p>
              {markedCount > 0 && (
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/70">
                  {markedCount} student{markedCount === 1 ? "" : "s"} still marked for this
                  day.
                </p>
              )}
              {canMark && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => holdClass.mutate()}
                    disabled={holdClass.isPending}
                  >
                    Hold class today
                  </Button>
                  {markedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clearDay.mutate()}
                      disabled={clearDay.isPending}
                    >
                      Clear attendance
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No students in this class"
        description="Enroll students from the Students page."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Extra-class banner: a normally-off day that was opened for marking. */}
      {workingDay.reason === "extra-class" && (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">
          Extra class — this day is normally off.
        </p>
      )}

      {/* Summary row */}
      <div className="bg-card grid grid-cols-4 divide-x rounded-xl border">
        <SumCell label="Total" value={summary.total} />
        <SumCell label="Present" value={summary.present} color="text-green-600" />
        <SumCell label="Absent" value={summary.absent} color="text-red-600" />
        <SumCell label="Leave" value={summary.leave} color="text-amber-600" />
      </div>

      {/* Bulk actions */}
      {canMark && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
            onClick={() => handleMarkAll("PRESENT")}
            disabled={markBulk.isPending}
          >
            All Present
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => handleMarkAll("ABSENT")}
            disabled={markBulk.isPending}
          >
            All Absent
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => handleMarkAll("LEAVE")}
            disabled={markBulk.isPending}
          >
            All Leave
          </Button>
        </div>
      )}

      {/* Student rows */}
      <div className="bg-card divide-y overflow-hidden rounded-xl border">
        {students.map((s) => {
          // WhatsApp the parent when the student is absent / on leave. With a
          // number the icon links to chat; without one it shows greyed-out with
          // a "No contact number" tooltip so the gap is explained, not blank.
          const number = toWhatsAppNumber(s.contactNumber)
          const notifiable = s.status === "ABSENT" || s.status === "LEAVE"
          const notifyUrl =
            number && (s.status === "ABSENT" || s.status === "LEAVE")
              ? whatsappUrl(
                  number,
                  attendanceAbsenceMessage({
                    studentName: s.studentName,
                    status: s.status,
                    date: formatDateLong(date),
                    institutionName: instituteName,
                  })
                )
              : null
          return (
            <div key={s.studentId} className="flex items-center gap-3 px-4 py-3">
              <span className="text-muted-foreground w-7 shrink-0 text-right text-xs tabular-nums">
                {s.rollNumber ?? s.serialNo}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {s.studentName}
              </p>
              {notifiable && (
                <WhatsAppIconLink href={notifyUrl} title="Notify parent on WhatsApp" />
              )}
              <AttendanceStatusToggle
                value={s.status}
                onChange={(status) => handleMark(s.studentId, status)}
                disabled={!canMark}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SumCell({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="py-3 text-center">
      <p className={`text-lg font-bold tabular-nums ${color ?? ""}`}>{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  )
}
