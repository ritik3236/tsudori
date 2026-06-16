"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Archive, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useArchiveStudent } from "@/features/students/hooks"

type Props = {
  studentId: string
  studentName: string
  canEdit: boolean
  canArchive: boolean
  isArchived: boolean
}

export function StudentProfileActions({
  studentId,
  studentName,
  canEdit,
  canArchive,
  isArchived,
}: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const archive = useArchiveStudent()

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
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
      {canArchive && !isArchived && (
        <>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => setConfirmOpen(true)}
          >
            <Archive className="size-4" /> Archive
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Archive ${studentName}?`}
            description="They'll be removed from active lists but their history is kept."
            confirmLabel="Archive"
            variant="destructive"
            loading={archive.isPending}
            onConfirm={() =>
              archive.mutate(studentId, {
                onSuccess: () => {
                  setConfirmOpen(false)
                  router.push("/students")
                },
              })
            }
          />
        </>
      )}
    </div>
  )
}
