"use client"

import { useState } from "react"
import { Undo2 } from "lucide-react"

import { ReversePaymentDialog } from "@/features/fees/components/reverse-payment-dialog"

type ReversePaymentButtonProps = {
  paymentId: string
  studentName: string
  /** Amount still reversible (original minus what's already been reversed). */
  remaining: number
}

export function ReversePaymentButton({
  paymentId,
  studentName,
  remaining,
}: ReversePaymentButtonProps) {
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
      <ReversePaymentDialog
        open={open}
        onOpenChange={setOpen}
        paymentId={paymentId}
        studentName={studentName}
        remaining={remaining}
      />
    </>
  )
}
