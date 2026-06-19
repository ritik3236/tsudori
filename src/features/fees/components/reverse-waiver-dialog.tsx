"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatCurrency } from "@/lib/format"
import { useReverseWaiver } from "@/features/fees/hooks"
import {
  waiverReversalFormSchema,
  waiverReversalValuesToInput,
  type WaiverReversalFormValues,
} from "@/features/fees/schema"
import { Button } from "@/components/ui/button"
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

type ReverseWaiverDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  waiverId: string
  studentName: string
  amount: number
}

export function ReverseWaiverDialog({
  open,
  onOpenChange,
  waiverId,
  studentName,
  amount,
}: ReverseWaiverDialogProps) {
  const router = useRouter()
  const reverse = useReverseWaiver()
  const form = useForm<WaiverReversalFormValues>({
    resolver: zodResolver(waiverReversalFormSchema),
    values: { reason: "" },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse waiver</DialogTitle>
          <DialogDescription>
            {studentName} · {formatCurrency(amount)} concession will be undone
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              reverse.mutate(waiverReversalValuesToInput(waiverId, values), {
                onSuccess: () => {
                  onOpenChange(false)
                  // The fee detail page is a server component — refresh it to
                  // re-derive balances and show the reversal entry in place.
                  router.refresh()
                },
              })
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="e.g. concession granted by mistake, wrong student"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-muted-foreground text-xs">
              Reversing restores the dues this concession had cleared. The original
              waiver stays on record for the audit trail.
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
                {reverse.isPending ? "Reversing…" : "Reverse waiver"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
