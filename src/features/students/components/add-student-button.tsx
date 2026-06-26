"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateStudentDialog } from "@/features/students/components/create-student-dialog"

// Canonical FAB (matches "Add class") that opens the create-student modal.
// `defaultOpen` lets a deep link (e.g. /students?new=1 from the dashboard) open it.
export function AddStudentButton({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 rounded-full shadow-lg lg:right-6 lg:bottom-6"
      >
        <Plus className="size-4" /> Add student
      </Button>
      <CreateStudentDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
