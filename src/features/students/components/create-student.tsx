"use client"

import { useRouter } from "next/navigation"

import { StudentForm } from "@/features/students/components/student-form"
import { useCreateStudent } from "@/features/students/hooks"

export function CreateStudent() {
  const router = useRouter()
  const create = useCreateStudent()

  return (
    <StudentForm
      syncClassFee
      submitLabel="Add student"
      submitting={create.isPending}
      onCancel={() => router.push("/students")}
      onSubmit={(input) =>
        create.mutate(input, {
          onSuccess: (student) => router.push(`/students/${student.id}`),
        })
      }
    />
  )
}
