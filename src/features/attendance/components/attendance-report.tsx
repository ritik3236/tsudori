"use client"

import { Calendar } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useAttendanceReport } from "@/features/attendance/hooks"
import type { AttendanceStatus } from "@/features/attendance/types"

const STATUS_CELL: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT: { label: "P", className: "text-green-600 font-semibold" },
  ABSENT: { label: "A", className: "text-red-600 font-semibold" },
  LEAVE: { label: "L", className: "text-amber-600 font-semibold" },
}

type Props = {
  classId: string
  month: string
}

export function AttendanceReport({ classId, month }: Props) {
  const { data, isLoading } = useAttendanceReport(classId, month)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!data) return null

  if (data.rows.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No students in this class"
        description="Enroll students to view their attendance report."
      />
    )
  }

  if (data.schoolDays.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No attendance recorded"
        description="Mark daily attendance to generate this month's report."
      />
    )
  }

  return (
    <div className="bg-card -mx-4 overflow-x-auto rounded-xl border px-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-card sticky left-0 pb-2 pr-4 text-left font-medium whitespace-nowrap pt-4">
              Student
            </th>
            {data.schoolDays.map((d) => (
              <th
                key={d}
                className="text-muted-foreground min-w-[28px] pb-2 px-1 text-center font-medium"
              >
                {parseInt(d.slice(8), 10)}
              </th>
            ))}
            <th className="text-muted-foreground pb-2 pl-3 pr-1 text-center font-medium">P</th>
            <th className="text-muted-foreground pb-2 px-1 text-center font-medium">A</th>
            <th className="text-muted-foreground pb-2 px-1 text-center font-medium">L</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.studentId} className="border-t">
              <td className="bg-card sticky left-0 py-2.5 pr-4 font-medium whitespace-nowrap">
                {row.studentName}
              </td>
              {data.schoolDays.map((d) => {
                const status = row.days[d] as AttendanceStatus | undefined
                const cfg = status ? STATUS_CELL[status] : null
                return (
                  <td key={d} className="py-2.5 px-1 text-center">
                    {cfg ? (
                      <span className={cfg.className}>{cfg.label}</span>
                    ) : (
                      <span className="text-muted-foreground/30">·</span>
                    )}
                  </td>
                )
              })}
              <td className="py-2.5 pl-3 pr-1 text-center tabular-nums font-semibold text-green-600">
                {row.summary.present}
              </td>
              <td className="py-2.5 px-1 text-center tabular-nums font-semibold text-red-600">
                {row.summary.absent}
              </td>
              <td className="py-2.5 px-1 text-center tabular-nums font-semibold text-amber-600">
                {row.summary.leave}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
