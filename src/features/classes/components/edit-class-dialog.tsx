"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClassForm } from "@/features/classes/components/class-form"
import { useUpdateClass } from "@/features/classes/hooks"
import type { ClassListItem } from "@/features/classes/types"

type EditClassDialogProps = {
  cls: ClassListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditClassDialog({ cls, open, onOpenChange }: EditClassDialogProps) {
  const update = useUpdateClass(cls.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
        </DialogHeader>
        <ClassForm
          defaultValues={cls}
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
