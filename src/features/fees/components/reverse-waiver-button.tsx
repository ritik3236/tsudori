"use client"

import { useState } from "react"
import { Undo2 } from "lucide-react"

import { ReverseWaiverDialog } from "@/features/fees/components/reverse-waiver-dialog"

type ReverseWaiverButtonProps = {
  waiverId: string
  studentName: string
  /** Amount being reversed (the waiver's remaining concession). */
  amount: number
}

export function ReverseWaiverButton({
  waiverId,
  studentName,
  amount,
}: ReverseWaiverButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-sm font-medium transition-colors hover:text-rose-600 dark:hover:text-rose-400"
      >
        <Undo2 className="size-3.5" /> Reverse
      </button>
      <ReverseWaiverDialog
        open={open}
        onOpenChange={setOpen}
        waiverId={waiverId}
        studentName={studentName}
        amount={amount}
      />
    </>
  )
}
