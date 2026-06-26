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
        title="Reverse waiver"
        aria-label="Reverse waiver"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/15"
      >
        <Undo2 className="size-4" />
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
