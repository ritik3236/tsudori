"use client"

import { useState } from "react"
import { CalendarClock } from "lucide-react"

import { formatCurrency, formatDateLong } from "@/lib/format"
import { useInstallmentPlan, useSwitchToMonthly } from "@/features/installments/hooks"
import {
  InstallmentScheduleEditor,
  statusTone,
} from "@/features/installments/components/installment-schedule-editor"
import { Button } from "@/components/ui/button"

type Props = {
  studentId: string
  canManage: boolean
  /** The student's total outstanding — seeds a fresh schedule's first row. */
  outstanding: number
}

const STATUS_LABEL: Record<string, string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  DUE: "Due",
  OVERDUE: "Overdue",
  UPCOMING: "Upcoming",
}

export function InstallmentPlanPanel({ studentId, canManage, outstanding }: Props) {
  const { data } = useInstallmentPlan(studentId)
  const switchToMonthly = useSwitchToMonthly()
  const [editing, setEditing] = useState(false)

  if (!data) return null
  const plan = data
  const isInstallment = plan.billingMode === "INSTALLMENT"

  // Nothing to show a monthly student's read-only viewer.
  if (!isInstallment && !canManage) return null

  const onSwitchMonthly = () => {
    if (
      !window.confirm(
        "Switch this student to monthly billing? Unpaid future installments will be removed (paid ones are kept)."
      )
    )
      return
    switchToMonthly.mutate(studentId)
  }

  // Monthly + canManage, idle: just a small button — no heading or card chrome.
  if (!isInstallment && !editing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <CalendarClock className="size-4" /> Set up installments
      </Button>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Installments</h2>
        {isInstallment && canManage && !editing && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onSwitchMonthly} disabled={switchToMonthly.isPending}>
              Switch to monthly
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit schedule
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <InstallmentScheduleEditor
          studentId={studentId}
          items={plan.items}
          suggestedTotal={outstanding}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          <ul className="divide-y">
            {plan.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{it.label || `Installment ${it.seq}`}</span>
                    <span className={statusTone(it.status)}>{STATUS_LABEL[it.status]}</span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                    due {formatDateLong(it.dueDate)}
                    {it.paid > 0 ? ` · ${formatCurrency(it.paid)} paid` : ""}
                    {it.waived > 0 ? ` · ${formatCurrency(it.waived)} waived` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(it.amount)}</p>
                  {it.outstanding > 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      {formatCurrency(it.outstanding)} due
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
