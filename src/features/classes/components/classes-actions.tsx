"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateClassDialog } from "@/features/classes/components/create-class-dialog"

// Small floating action, bottom-right. Lifted clear of the mobile bottom nav +
// safe area; sits in the corner on desktop (where there's no bottom bar).
export function ClassesActions() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 rounded-full shadow-lg lg:right-6 lg:bottom-6"
      >
        <Plus className="size-4" /> Add class
      </Button>
      <CreateClassDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
