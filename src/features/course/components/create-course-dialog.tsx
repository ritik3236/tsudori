"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CourseForm } from "@/features/course/components/course-form"
import { useCreateCourse } from "@/features/course/hooks"

type CreateCourseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCourseDialog({ open, onOpenChange }: CreateCourseDialogProps) {
  const create = useCreateCourse()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
        </DialogHeader>
        <CourseForm
          submitLabel="Create course"
          submitting={create.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={(input) =>
            create.mutate(input, { onSuccess: () => onOpenChange(false) })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
