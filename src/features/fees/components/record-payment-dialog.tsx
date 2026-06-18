"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PaymentForm } from "@/features/fees/components/payment-form"
import { formValuesToInput } from "@/features/fees/schema"
import { useRecordPayment } from "@/features/fees/hooks"

type RecordPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  monthlyFee: number
  remainingDue?: number
  defaultMonth?: number
  defaultYear?: number
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  monthlyFee,
  remainingDue,
  defaultMonth,
  defaultYear,
}: RecordPaymentDialogProps) {
  const record = useRecordPayment()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>{studentName}</DialogDescription>
        </DialogHeader>
        <PaymentForm
          // Remount on open (and when the target period changes) so useForm
          // re-reads fresh defaults — otherwise switching the month-view strip
          // then opening shows the stale month and hides the waive option.
          key={`${open}:${defaultMonth ?? ""}:${defaultYear ?? ""}`}
          monthlyFee={monthlyFee}
          remainingDue={remainingDue}
          defaultMonth={defaultMonth}
          defaultYear={defaultYear}
          submitting={record.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={(values) =>
            record.mutate(formValuesToInput(studentId, values), {
              onSuccess: () => onOpenChange(false),
            })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
