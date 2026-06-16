"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateClassDialog } from "@/features/classes/components/create-class-dialog"

export function ClassesActions() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add class
      </Button>
      <CreateClassDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
