"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatCurrency } from "@/lib/format"
import { useReversePayment } from "@/features/fees/hooks"
import {
  reversalFormSchema,
  reversalValuesToInput,
  type ReversalFormValues,
} from "@/features/fees/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type ReversePaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentId: string
  studentName: string
  /** Amount still reversible (original minus what's already been reversed). */
  remaining: number
}

export function ReversePaymentDialog({
  open,
  onOpenChange,
  paymentId,
  studentName,
  remaining,
}: ReversePaymentDialogProps) {
  const router = useRouter()
  const reverse = useReversePayment()
  const form = useForm<ReversalFormValues>({
    resolver: zodResolver(reversalFormSchema),
    values: { amount: remaining > 0 ? String(remaining) : "", reason: "" },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse payment</DialogTitle>
          <DialogDescription>
            {studentName} · up to {formatCurrency(remaining)} reversible
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              reverse.mutate(reversalValuesToInput(paymentId, values), {
                onSuccess: () => {
                  onOpenChange(false)
                  // The fee detail page is a server component, so refresh it to
                  // re-derive balances and show the new reversal entry in place.
                  router.refresh()
                },
              })
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to reverse</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max={remaining}
                      step="1"
                      inputMode="numeric"
                      {...field}
                    />
                  </FormControl>
                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        form.setValue("amount", String(remaining), {
                          shouldValidate: true,
                        })
                      }
                      className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
                    >
                      Full amount — {formatCurrency(remaining)}
                    </button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="e.g. entered by mistake, bounced cheque, refunded"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-muted-foreground text-xs">
              A reversal records a credit against the original receipt — it restores
              the dues for that month. The original payment stays on record.
            </p>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={reverse.isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={reverse.isPending}
                className="w-full sm:w-auto"
              >
                {reverse.isPending ? "Reversing…" : "Reverse payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
