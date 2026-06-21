"use client"

import { useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatCurrency, toDateInputValue } from "@/lib/format"
import { appYearMonth, nowDate } from "@/lib/date-helper"
import { planPayment } from "@/features/fees/logic"
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

function defaults(monthlyFee: number, remainingDue?: number): PaymentFormValues {
  const now = nowDate()
  // Prefill the current month's remaining due (falling back to the full fee), the
  // usual "collect this month" case. The cash still lands oldest-first on save.
  const due = remainingDue ?? monthlyFee
  return {
    amount: due > 0 ? String(due) : "",
    method: "CASH",
    paidAt: toDateInputValue(now),
    note: "",
    waiveRemaining: false,
  }
}

type AllocationContext = {
  admission: { year: number; month: number }
  paidByMonth: Record<string, number>
  waivedByMonth: Record<string, number>
}

// Total still owed across every billable month (admission..now), from the live
// per-month ledger — mirrors the server's totalOutstanding. Drives the
// "waive remaining" option. Falls back to the single `remainingDue` when no
// ledger is loaded yet. Capped per month so a prepaid month can't offset another.
function totalDue(
  monthlyFee: number,
  allocationContext?: AllocationContext,
  fallback?: number
): number {
  if (!allocationContext) return Math.max(0, fallback ?? 0)
  const now = appYearMonth(nowDate())
  let total = 0
  let y = allocationContext.admission.year
  let m = allocationContext.admission.month
  while (y < now.year || (y === now.year && m <= now.month)) {
    const k = `${y}-${m}`
    total += Math.max(
      0,
      monthlyFee -
        (allocationContext.paidByMonth[k] ?? 0) -
        (allocationContext.waivedByMonth[k] ?? 0)
    )
    if (m === 12) {
      y += 1
      m = 1
    } else {
      m += 1
    }
  }
  return total
}

type PaymentFormProps = {
  monthlyFee: number
  // Outstanding due for the default period; the amount prefill and a fallback for
  // total outstanding before the ledger loads.
  remainingDue?: number
  // Whether the viewer holds fee:waive — required to show the "waive remaining" option.
  canWaive?: boolean
  // Lets the form preview where the payment will land (runs the real allocator).
  allocationContext?: {
    admission: { year: number; month: number }
    paidByMonth: Record<string, number>
    waivedByMonth: Record<string, number>
  }
  submitting: boolean
  onSubmit: (values: PaymentFormValues) => void
  onCancel: () => void
}

export function PaymentForm({
  monthlyFee,
  remainingDue,
  canWaive = false,
  allocationContext,
  submitting,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: defaults(monthlyFee, remainingDue),
  })

  const watched = useWatch({ control: form.control })
  const amount = Number(watched.amount || 0)

  // Pay-and-clear: offer to waive whatever the cash leaves owing, across every
  // month — so a partial payment can fully settle a student who owes several
  // months. The waiver is total outstanding minus what this payment covers.
  const totalOutstanding = useMemo(
    () => totalDue(monthlyFee, allocationContext, remainingDue),
    [monthlyFee, allocationContext, remainingDue]
  )
  const waiveAmount = Math.max(0, totalOutstanding - amount)
  const showWaiveOption = canWaive && amount > 0 && waiveAmount > 0

  // Don't leave a stale "waive" checked once there's nothing left to waive
  // (the amount now covers all dues, or the viewer lacks fee:waive).
  useEffect(() => {
    if (!showWaiveOption && form.getValues("waiveRemaining")) {
      form.setValue("waiveRemaining", false)
    }
  }, [showWaiveOption, form])

  // Live breakdown of where the cash lands, using the SAME allocator the server
  // runs — oldest unpaid month first, then prepaying upcoming months. This is the
  // receipt-in-advance, so there's no month to pick.
  const now = appYearMonth(nowDate())
  const nowOrd = now.year * 12 + now.month
  const willWaive = Boolean(watched.waiveRemaining)

  // Per-month settlement preview: cash (oldest-first) plus, when "waive remaining"
  // is on, the months waived to clear the rest. Merged so a month that gets both
  // partial cash and a waiver shows both (e.g. Apr ₹300 + ₹1,200 waived).
  const breakdown = useMemo(() => {
    if (!allocationContext || amount <= 0) return []
    const plan = planPayment({
      fee: monthlyFee,
      paid: new Map(Object.entries(allocationContext.paidByMonth)),
      waived: new Map(Object.entries(allocationContext.waivedByMonth)),
      selected: now,
      admission: allocationContext.admission,
      now,
      amount,
      waiveRemaining: willWaive,
    })
    const byMonth = new Map<
      string,
      { year: number; month: number; paid: number; waived: number }
    >()
    const slot = (y: number, m: number) => {
      const k = `${y}-${m}`
      let e = byMonth.get(k)
      if (!e) {
        e = { year: y, month: m, paid: 0, waived: 0 }
        byMonth.set(k, e)
      }
      return e
    }
    for (const a of plan.allocations) slot(a.year, a.month).paid += a.amount
    for (const w of plan.waiveAllocations) slot(w.year, w.month).waived += w.amount
    return [...byMonth.values()].sort(
      (a, b) => a.year - b.year || a.month - b.month
    )
  }, [allocationContext, monthlyFee, amount, now, willWaive])

  // A month is a prepayment when it's later than the current period.
  const isPrepay = (e: { year: number; month: number }) =>
    e.year * 12 + e.month > nowOrd

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
              <FormMessage />
            </FormItem>
          )}
        />

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
            name="waiveRemaining"
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
                      Mark fully settled — waive remaining {formatCurrency(waiveAmount)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      Collects {formatCurrency(amount)} and waives the remaining{" "}
                      {formatCurrency(waiveAmount)}, clearing this student&apos;s dues.
                    </span>
                  </span>
                </label>
              </FormItem>
            )}
          />
        )}

        {breakdown.length > 0 && (
          <div className="bg-muted/40 rounded-lg border px-3 py-2.5">
            <p className="text-muted-foreground text-xs">
              {willWaive
                ? "This clears the student's dues, oldest-first:"
                : "This payment is applied oldest-first:"}
            </p>
            <ul className="mt-2 space-y-0.5">
              {breakdown.map((e) => (
                <li
                  key={`${e.year}-${e.month}`}
                  className="flex items-center justify-between text-xs tabular-nums"
                >
                  <span>
                    {MONTHS[e.month - 1]} {e.year}
                    {isPrepay(e) && (
                      <span className="text-muted-foreground"> · prepaid</span>
                    )}
                  </span>
                  <span className="font-medium">
                    {e.paid > 0 && formatCurrency(e.paid)}
                    {e.paid > 0 && e.waived > 0 && " + "}
                    {e.waived > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-300">
                        {formatCurrency(e.waived)} waived
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
