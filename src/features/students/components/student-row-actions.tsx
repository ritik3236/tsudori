"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, MoreHorizontal, Pencil, Archive } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useArchiveStudent } from "@/features/students/hooks"

type StudentRowActionsProps = {
  studentId: string
  studentName: string
  canEdit: boolean
  canArchive: boolean
}

export function StudentRowActions({
  studentId,
  studentName,
  canEdit,
  canArchive,
}: StudentRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const archive = useArchiveStudent()

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
          <DropdownMenuItem render={<Link href={`/students/${studentId}`} />}>
            <Eye className="size-4" /> View
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem render={<Link href={`/students/${studentId}/edit`} />}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
          )}
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Archive className="size-4" /> Archive
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Archive ${studentName}?`}
        description="They'll be removed from active lists but their attendance and fee history is kept. You can restore them later."
        confirmLabel="Archive"
        variant="destructive"
        loading={archive.isPending}
        onConfirm={() =>
          archive.mutate(studentId, { onSuccess: () => setConfirmOpen(false) })
        }
      />
    </>
  )
}
