"use client"

import { useRouter } from "next/navigation"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StudentForm } from "@/features/students/components/student-form"
import { useCreateStudent } from "@/features/students/hooks"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateStudentDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const create = useCreateStudent()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The form is long — cap height + scroll so it never runs off-screen. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add student</DialogTitle>
        </DialogHeader>
        <StudentForm
          requireClass
          submitLabel="Add student"
          submitting={create.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (student) => {
                onOpenChange(false)
                router.push(`/students/${student.id}`)
              },
            })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
