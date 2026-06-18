"use client"

import { useState, type ComponentProps } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RecordPaymentDialog } from "@/features/fees/components/record-payment-dialog"

type RecordPaymentButtonProps = {
  studentId: string
  studentName: string
  monthlyFee: number
  remainingDue?: number
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  className?: string
  defaultMonth?: number
  defaultYear?: number
}

export function RecordPaymentButton({
  studentId,
  studentName,
  monthlyFee,
  remainingDue,
  label = "Record payment",
  variant = "default",
  size = "default",
  className,
  defaultMonth,
  defaultYear,
}: RecordPaymentButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" /> {label}
      </Button>
      <RecordPaymentDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        monthlyFee={monthlyFee}
        remainingDue={remainingDue}
        defaultMonth={defaultMonth}
        defaultYear={defaultYear}
      />
    </>
  )
}
