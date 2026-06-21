"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Archive, Check, ChevronDown, HandCoins, Pencil, RotateCcw } from "lucide-react"
import type { StudentStatus } from "@prisma/client"

import { STUDENT_STATUSES } from "@/features/students/schema"
import { STUDENT_STATUS_LABEL } from "@/features/students/components/student-status-badge"
import {
  useArchiveStudent,
  useRestoreStudent,
  useUpdateStudent,
} from "@/features/students/hooks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

type Props = {
  studentId: string
  studentName: string
  status: StudentStatus
  canViewFees: boolean
  canEdit: boolean
  canArchive: boolean
  isArchived: boolean
}

export function StudentProfileActions({
  studentId,
  studentName,
  status,
  canViewFees,
  canEdit,
  canArchive,
  isArchived,
}: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const archive = useArchiveStudent()
  const restore = useRestoreStudent()
  const update = useUpdateStudent(studentId)

  const canChangeStatus = canEdit && !isArchived
  const showArchive = canArchive && !isArchived
  const canRestore = canArchive && isArchived
  // Status changes and archive share one menu — show it if either is available.
  const showMenu = canChangeStatus || showArchive

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {canViewFees && (
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          render={
            <Link href={`/fees/${studentId}`}>
              <HandCoins className="size-4" /> View fees
            </Link>
          }
        />
      )}
      {canEdit && (
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          render={
            <Link href={`/students/${studentId}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          }
        />
      )}

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                disabled={update.isPending}
                aria-label="Change status or archive"
              >
                {STUDENT_STATUS_LABEL[status]}
                <ChevronDown className="size-4 opacity-60" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            {canChangeStatus &&
              STUDENT_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  disabled={s === status || update.isPending}
                  onClick={() =>
                    update.mutate({ status: s }, { onSuccess: () => router.refresh() })
                  }
                >
                  <Check className={s === status ? "size-4" : "size-4 opacity-0"} />
                  {STUDENT_STATUS_LABEL[s]}
                </DropdownMenuItem>
              ))}
            {showArchive && (
              <>
                {canChangeStatus && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Archive className="size-4" /> Archive
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {canRestore && (
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          disabled={restore.isPending}
          onClick={() =>
            restore.mutate(studentId, { onSuccess: () => router.refresh() })
          }
        >
          <RotateCcw className="size-4" /> Restore
        </Button>
      )}

      {showArchive && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Archive ${studentName}?`}
          description="They'll be removed from active lists but their history is kept."
          confirmLabel="Archive"
          variant="destructive"
          loading={archive.isPending}
          withReason
          reasonPlaceholder="e.g. Moved to another school"
          onConfirm={(reason) =>
            archive.mutate(
              { id: studentId, reason },
              {
                onSuccess: () => {
                  setConfirmOpen(false)
                  router.push("/students")
                },
              }
            )
          }
        />
      )}
    </div>
  )
}
