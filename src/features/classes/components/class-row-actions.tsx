"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, PowerOff, Power } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EditClassDialog } from "@/features/classes/components/edit-class-dialog"
import { useUpdateClass } from "@/features/classes/hooks"
import type { ClassListItem } from "@/features/classes/types"

type ClassRowActionsProps = {
  cls: ClassListItem
}

export function ClassRowActions({ cls }: ClassRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const update = useUpdateClass(cls.id)

  const isActive = cls.status === "ACTIVE"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Open actions">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isActive ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeactivateOpen(true)}
            >
              <PowerOff className="size-4" /> Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => update.mutate({ status: "ACTIVE" })}
              disabled={update.isPending}
            >
              <Power className="size-4" /> Activate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditClassDialog cls={cls} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={`Deactivate "${cls.name}"?`}
        description={
          cls.studentCount > 0
            ? `${cls.studentCount} student${cls.studentCount !== 1 ? "s" : ""} are still in this class. They'll remain assigned but the class won't appear in new-student dropdowns.`
            : "The class will be hidden from new-student dropdowns. You can reactivate it any time."
        }
        confirmLabel="Deactivate"
        variant="destructive"
        loading={update.isPending}
        onConfirm={() =>
          update.mutate(
            { status: "INACTIVE" },
            { onSuccess: () => setDeactivateOpen(false) }
          )
        }
      />
    </>
  )
}
