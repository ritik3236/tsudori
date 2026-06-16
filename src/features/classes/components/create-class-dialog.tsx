"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClassForm } from "@/features/classes/components/class-form"
import { useCreateClass } from "@/features/classes/hooks"

type CreateClassDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateClassDialog({ open, onOpenChange }: CreateClassDialogProps) {
  const create = useCreateClass()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New class</DialogTitle>
        </DialogHeader>
        <ClassForm
          submitLabel="Create class"
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
