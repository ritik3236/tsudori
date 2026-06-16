"use client"

import { useRouter } from "next/navigation"

import {
  StudentForm,
  studentToFormValues,
} from "@/features/students/components/student-form"
import { useStudent, useUpdateStudent } from "@/features/students/hooks"
import { Skeleton } from "@/components/ui/skeleton"

export function EditStudent({ studentId }: { studentId: string }) {
  const router = useRouter()
  const { data: student, isLoading } = useStudent(studentId)
  const update = useUpdateStudent(studentId)

  if (isLoading || !student) {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <StudentForm
      submitLabel="Save changes"
      submitting={update.isPending}
      defaultValues={studentToFormValues(student)}
      onCancel={() => router.push(`/students/${studentId}`)}
      onSubmit={(input) =>
        update.mutate(input, {
          onSuccess: () => router.push(`/students/${studentId}`),
        })
      }
    />
  )
}
