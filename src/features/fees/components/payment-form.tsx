"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatCurrency, toDateInputValue } from "@/lib/format"
import { appYearMonth } from "@/lib/date-helper"
import { Checkbox } from "@/components/ui/checkbox"
import {
  METHOD_LABELS,
  PAYMENT_METHODS,
  paymentFormSchema,
  type PaymentFormValues,
} from "@/features/fees/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function defaults(
  monthlyFee: number,
  defaultMonth?: number,
  defaultYear?: number
): PaymentFormValues {
  const now = new Date()
  const { year, month } = appYearMonth(now)
  return {
    amount: monthlyFee > 0 ? String(monthlyFee) : "",
    periodMonth: String(defaultMonth ?? month),
    periodYear: String(defaultYear ?? year),
    method: "CASH",
    paidAt: toDateInputValue(now),
    note: "",
    waiveShortfall: false,
  }
}

type PaymentFormProps = {
  monthlyFee: number
  // Outstanding due for the default period; enables the "settle short" option.
  remainingDue?: number
  // Whether the viewer holds fee:waive — required to show the settle-short option.
  canWaive?: boolean
  submitting: boolean
  onSubmit: (values: PaymentFormValues) => void
  onCancel: () => void
  defaultMonth?: number
  defaultYear?: number
}

export function PaymentForm({
  monthlyFee,
  remainingDue,
  canWaive = false,
  submitting,
  onSubmit,
  onCancel,
  defaultMonth,
  defaultYear,
}: PaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: defaults(monthlyFee, defaultMonth, defaultYear),
  })

  const thisYear = appYearMonth(new Date()).year
  const years = [thisYear - 1, thisYear, thisYear + 1]

  // Settle-short: only offer to waive the leftover when we actually know the due
  // for the period being recorded — i.e. the default month/year that `remainingDue`
  // was computed for. Changing the month hides it (that month's due is unknown).
  const watched = useWatch({ control: form.control })
  const amount = Number(watched.amount || 0)
  const samePeriod =
    defaultMonth != null &&
    defaultYear != null &&
    Number(watched.periodMonth) === defaultMonth &&
    Number(watched.periodYear) === defaultYear
  const shortfall =
    remainingDue != null && samePeriod ? Math.max(0, remainingDue - amount) : 0
  // Show the settle-short option only if the viewer can waive AND there's a real
  // shortfall on the known period.
  const showWaiveOption = canWaive && shortfall > 0 && amount > 0

  // Don't leave a stale "waive" checked once the shortfall disappears (full/over-
  // payment, the month was changed, or the viewer lacks fee:waive).
  useEffect(() => {
    if (!showWaiveOption && form.getValues("waiveShortfall")) {
      form.setValue("waiveShortfall", false)
    }
  }, [showWaiveOption, form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1" inputMode="numeric" {...field} />
              </FormControl>
              {monthlyFee > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    form.setValue("amount", String(monthlyFee), { shouldValidate: true })
                  }
                  className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
                >
                  Full month — {formatCurrency(monthlyFee)}
                </button>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="periodMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>For month</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) => MONTHS[Number(v) - 1] ?? "Month"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="periodYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) =>
                          METHOD_LABELS[v as keyof typeof METHOD_LABELS] ?? v
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paidAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid on</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="e.g. partial payment, balance next week"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showWaiveOption && (
          <FormField
            control={form.control}
            name="waiveShortfall"
            render={({ field }) => (
              <FormItem>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      Mark fully paid — waive remaining {formatCurrency(shortfall)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      Records {formatCurrency(amount)} as collected and waives{" "}
                      {formatCurrency(shortfall)} as a concession, so this month
                      closes as settled.
                    </span>
                  </span>
                </label>
              </FormItem>
            )}
          />
        )}

        <p className="text-muted-foreground text-xs">
          Anything beyond this month&apos;s due clears outstanding months first
          (oldest first), then prepays upcoming months.
        </p>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Saving…" : "Record payment"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
