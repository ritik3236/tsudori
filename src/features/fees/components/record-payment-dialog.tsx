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
  canWaive?: boolean
  allocationContext?: {
    admission: { year: number; month: number }
    paidByMonth: Record<string, number>
    waivedByMonth: Record<string, number>
  }
  billingMode?: "MONTHLY" | "INSTALLMENT"
  installments?: { id: string; label: string | null; dueDate: string; outstanding: number }[]
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  monthlyFee,
  remainingDue,
  canWaive,
  allocationContext,
  billingMode,
  installments,
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
          // Remount on open so useForm re-reads fresh defaults each time.
          key={String(open)}
          monthlyFee={monthlyFee}
          remainingDue={remainingDue}
          canWaive={canWaive}
          allocationContext={allocationContext}
          billingMode={billingMode}
          installments={installments}
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
