"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, PowerOff, Power } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EditCourseDialog } from "@/features/course/components/edit-course-dialog"
import { useUpdateCourse } from "@/features/course/hooks"
import type { CourseListItem } from "@/features/course/types"

type CourseRowActionsProps = {
  course: CourseListItem
}

export function CourseRowActions({ course }: CourseRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const update = useUpdateCourse(course.id)

  const isActive = course.status === "ACTIVE"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Open actions">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isActive ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeactivateOpen(true)}
            >
              <PowerOff className="size-4" /> Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => update.mutate({ status: "ACTIVE" })}
              disabled={update.isPending}
            >
              <Power className="size-4" /> Activate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCourseDialog course={course} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={`Deactivate "${course.name}"?`}
        description={
          course.enrollmentCount > 0
            ? `${course.enrollmentCount} enrolment${course.enrollmentCount !== 1 ? "s" : ""} reference this course. They keep billing; the course just won't appear when assigning new ones.`
            : "The course will be hidden when assigning new classes/enrolments. You can reactivate it any time."
        }
        confirmLabel="Deactivate"
        variant="destructive"
        loading={update.isPending}
        onConfirm={() =>
          update.mutate(
            { status: "INACTIVE" },
            { onSuccess: () => setDeactivateOpen(false) }
          )
        }
      />
    </>
  )
}
