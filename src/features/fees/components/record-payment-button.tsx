"use client"

import { useState, type ComponentProps } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useStudentFee } from "@/features/fees/hooks"
import { RecordPaymentDialog } from "@/features/fees/components/record-payment-dialog"

type RecordPaymentButtonProps = {
  studentId: string
  studentName: string
  monthlyFee: number
  remainingDue?: number
  canWaive?: boolean
  allocationContext?: {
    admission: { year: number; month: number }
    paidByMonth: Record<string, number>
    waivedByMonth: Record<string, number>
  }
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function RecordPaymentButton({
  studentId,
  studentName,
  monthlyFee,
  remainingDue,
  canWaive,
  allocationContext,
  label = "Record payment",
  variant = "default",
  size = "default",
  className,
}: RecordPaymentButtonProps) {
  const [open, setOpen] = useState(false)

  // When opened from a list that doesn't carry allocation data (the month view,
  // the fees table), fetch the student's fee detail so the dialog shows the same
  // oldest-first allocation preview as the detail page. The detail page already
  // passes allocationContext, so it never fetches.
  const needsContext = open && !allocationContext
  const { data: detail } = useStudentFee(needsContext ? studentId : "")
  const resolvedContext =
    allocationContext ??
    (detail
      ? {
          admission: detail.admission,
          paidByMonth: detail.paidByMonth,
          waivedByMonth: detail.waivedByMonth,
        }
      : undefined)

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
        canWaive={canWaive}
        allocationContext={resolvedContext}
      />
    </>
  )
}
