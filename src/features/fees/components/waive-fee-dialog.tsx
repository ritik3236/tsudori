"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatCurrency } from "@/lib/format"
import { useWaiveFee } from "@/features/fees/hooks"
import {
  waiverFormSchema,
  waiverValuesToInput,
  type WaiverFormValues,
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type WaiveFeeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  /** Outstanding amount for the month — the default (and max sensible) waiver. */
  remainingDue: number
  periodMonth: number
  periodYear: number
}

export function WaiveFeeDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  remainingDue,
  periodMonth,
  periodYear,
}: WaiveFeeDialogProps) {
  const waive = useWaiveFee()
  const form = useForm<WaiverFormValues>({
    resolver: zodResolver(waiverFormSchema),
    values: {
      amount: remainingDue > 0 ? String(remainingDue) : "",
      reason: "",
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Waive fee</DialogTitle>
          <DialogDescription>
            {studentName} · {MONTHS[periodMonth - 1]} {periodYear}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              waive.mutate(
                waiverValuesToInput(studentId, periodMonth, periodYear, values),
                { onSuccess: () => onOpenChange(false) }
              )
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to waive</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="1" inputMode="numeric" {...field} />
                  </FormControl>
                  {remainingDue > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        form.setValue("amount", String(remainingDue), {
                          shouldValidate: true,
                        })
                      }
                      className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
                    >
                      Full due — {formatCurrency(remainingDue)}
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
                      placeholder="e.g. scholarship, sibling discount, hardship"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-muted-foreground text-xs">
              A waiver reduces what this student owes for the month. It is recorded
              as a concession, not as money collected.
            </p>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={waive.isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={waive.isPending}
                className="w-full sm:w-auto"
              >
                {waive.isPending ? "Saving…" : "Waive fee"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
