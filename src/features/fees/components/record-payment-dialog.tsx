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
  defaultMonth?: number
  defaultYear?: number
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  monthlyFee,
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
          monthlyFee={monthlyFee}
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
