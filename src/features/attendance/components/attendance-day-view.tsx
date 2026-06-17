"use client"

import { useEffect, useRef } from "react"
import { Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { AttendanceStatusToggle } from "./attendance-status-toggle"
import { useAttendanceDay, useMarkAttendance, useMarkBulkAttendance } from "@/features/attendance/hooks"
import type { AttendanceStatus } from "@/features/attendance/types"

type Props = {
  classId: string
  date: string
  canMark: boolean
}

export function AttendanceDayView({ classId, date, canMark }: Props) {
  const { data, isLoading } = useAttendanceDay(classId, date)
  const mark = useMarkAttendance(classId, date)
  const markBulk = useMarkBulkAttendance(classId, date)

  // Auto-mark all unmarked students as Present when the day loads for the first time.
  // Teachers only need to change who is Absent or on Leave.
  const autoMarked = useRef(new Set<string>())
  useEffect(() => {
    if (!canMark || !data) return
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

  const { students, summary } = data

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
        {students.map((s) => (
          <div
            key={s.studentId}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className="text-muted-foreground w-7 shrink-0 text-right text-xs tabular-nums">
              {s.rollNumber ?? s.serialNo}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {s.studentName}
            </p>
            <AttendanceStatusToggle
              value={s.status}
              onChange={(status) => handleMark(s.studentId, status)}
              disabled={!canMark}
            />
          </div>
        ))}
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
