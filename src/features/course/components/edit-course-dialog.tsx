"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CourseForm } from "@/features/course/components/course-form"
import { useUpdateCourse } from "@/features/course/hooks"
import type { CourseListItem } from "@/features/course/types"

type EditCourseDialogProps = {
  course: CourseListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCourseDialog({ course, open, onOpenChange }: EditCourseDialogProps) {
  const update = useUpdateCourse(course.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit course</DialogTitle>
        </DialogHeader>
        <CourseForm
          defaultValues={course}
          submitLabel="Save changes"
          submitting={update.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={(input) =>
            update.mutate(input, { onSuccess: () => onOpenChange(false) })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
