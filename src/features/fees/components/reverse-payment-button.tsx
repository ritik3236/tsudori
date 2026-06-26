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
        title="Reverse payment"
        aria-label="Reverse payment"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/15"
      >
        <Undo2 className="size-4" />
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
