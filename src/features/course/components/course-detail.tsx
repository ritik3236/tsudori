"use client"

import { useState } from "react"
import Link from "next/link"
import { Pencil } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { EditCourseDialog } from "@/features/course/components/edit-course-dialog"
import { BundleBadge } from "@/features/course/components/bundle-badge"
import type { CourseListItem, CourseStudentItem } from "@/features/course/types"

type CourseDetailProps = {
  course: CourseListItem
  students: CourseStudentItem[]
  canManage: boolean
}

export function CourseDetail({ course, students, canManage }: CourseDetailProps) {
  const [editOpen, setEditOpen] = useState(false)

  const oneTimeTotal = course.components.reduce((sum, c) => sum + c.amount, 0)
  const membersSum = course.members.reduce((sum, m) => sum + m.monthlyFee, 0)
  const bundleSaving = Math.max(0, membersSum - course.monthlyFee)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{course.name}</h1>
            <StatusBadge active={course.status === "ACTIVE"} />
            {course.isBundle && <BundleBadge />}
          </div>
          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-foreground font-medium">
                {formatCurrency(course.monthlyFee)}/mo
              </span>{" "}
              · {course.durationMonths} months
            </span>
            <span>
              {course.enrollmentCount} enrolment{course.enrollmentCount !== 1 ? "s" : ""}
            </span>
            <span>
              {course.classCount} class{course.classCount !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        )}
      </div>

      {/* Bundled courses — what this combo includes */}
      {course.isBundle && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Bundled courses</h2>
          {course.members.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No courses in this bundle yet — edit it to choose what it includes.
            </p>
          ) : (
            <div className="bg-card overflow-hidden rounded-xl border">
              <ul className="divide-y">
                {course.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                    <Link href={`/courses/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(m.monthlyFee)}/mo
                    </span>
                  </li>
                ))}
                <li className="text-muted-foreground flex items-center justify-between p-3.5 text-xs">
                  <span>Sum if bought separately</span>
                  <span className="tabular-nums">{formatCurrency(membersSum)}/mo</span>
                </li>
                <li className="flex items-center justify-between p-3.5 text-sm font-semibold">
                  <span>Combined bundle fee</span>
                  <span className="tabular-nums">{formatCurrency(course.monthlyFee)}/mo</span>
                </li>
                {bundleSaving > 0 && (
                  <li className="flex items-center justify-between p-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span>Saving vs separate</span>
                    <span className="tabular-nums">{formatCurrency(bundleSaving)}/mo</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* One-time fees */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">One-time fees</h2>
        {course.components.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No one-time fees. These are charged once when a student enrols (e.g. admission, exam).
          </p>
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border">
            <ul className="divide-y">
              {course.components.map((m) => (
                <li key={m.id} className="flex items-center justify-between p-3.5 text-sm">
                  <span>{m.name}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(m.amount)}</span>
                </li>
              ))}
              <li className="text-muted-foreground flex items-center justify-between p-3.5 text-xs">
                <span>Total one-time</span>
                <span className="tabular-nums">{formatCurrency(oneTimeTotal)}</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Enrolled students */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          Enrolled students{students.length > 0 ? ` (${students.length})` : ""}
        </h2>
        {students.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No students enrolled in this course yet.
          </p>
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border">
            <ul className="divide-y">
              {students.map((s) => (
                <li key={s.studentId} className="flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <Link
                      href={`/fees/${s.studentId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {s.fullName}
                    </Link>
                    <span className="text-muted-foreground ml-2 text-xs">ID {s.serialNo}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm tabular-nums">
                      {formatCurrency(s.effectiveFee)}/mo
                    </span>
                    {s.status !== "ACTIVE" && (
                      <span className="text-muted-foreground text-xs capitalize">
                        {s.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {canManage && (
        <EditCourseDialog course={course} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  )
}
