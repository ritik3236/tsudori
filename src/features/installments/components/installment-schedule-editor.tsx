"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import { toDateInputValue, todayInAppTz, shiftMonthStr } from "@/lib/date-helper"
import { splitEvenly } from "@/features/installments/logic"
import { useSaveInstallmentPlan } from "@/features/installments/hooks"
import type { InstallmentPlanItem } from "@/features/installments/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"

type Row = {
  key: string
  id?: string
  dueDate: string
  amount: string
  label: string
  locked: boolean
}

let keySeq = 0
const newKey = () => `r${keySeq++}`

function toRow(it: InstallmentPlanItem): Row {
  return {
    key: newKey(),
    id: it.id,
    dueDate: toDateInputValue(it.dueDate),
    amount: String(it.amount),
    label: it.label ?? "",
    locked: it.locked,
  }
}

type Props = {
  studentId: string
  items: InstallmentPlanItem[]
  /** Remaining course fee (total program − paid − waived) — seeds the first row when
   *  starting fresh, then Add rows + Split evenly to break it up. */
  suggestedTotal: number
  onDone: () => void
}

export function InstallmentScheduleEditor({ studentId, items, suggestedTotal, onDone }: Props) {
  const save = useSaveInstallmentPlan()
  const [rows, setRows] = useState<Row[]>(() =>
    items.length
      ? items.map(toRow)
      : [
          {
            key: newKey(),
            dueDate: todayInAppTz(),
            amount: suggestedTotal > 0 ? String(suggestedTotal) : "",
            label: "",
            locked: false,
          },
        ]
  )

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows]
  )

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const addRow = () =>
    setRows((rs) => {
      const last = rs[rs.length - 1]
      const dueDate = last ? shiftMonthStr(last.dueDate.slice(0, 7), 1) + last.dueDate.slice(7) : todayInAppTz()
      return [...rs, { key: newKey(), dueDate, amount: "", label: "", locked: false }]
    })

  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key))

  // Redistribute the current total evenly across the unpaid rows (locked rows keep
  // their amount; the rest split what's left).
  const splitEven = () => {
    const lockedTotal = rows.filter((r) => r.locked).reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const unlocked = rows.filter((r) => !r.locked)
    if (!unlocked.length) return
    const target = Math.max(0, total - lockedTotal)
    const parts = splitEvenly(target, unlocked.length)
    let i = 0
    setRows((rs) => rs.map((r) => (r.locked ? r : { ...r, amount: String(parts[i++] ?? 0) })))
  }

  const submit = () => {
    const payloadRows = rows.map((r) => ({
      id: r.id,
      dueDate: r.dueDate,
      amount: Number(r.amount) || 0,
      label: r.label.trim() || null,
    }))
    save.mutate({ studentId, rows: payloadRows }, { onSuccess: onDone })
  }

  const canSave = rows.length > 0 && rows.every((r) => r.dueDate && Number(r.amount) >= 0)

  return (
    <div className="bg-card space-y-2.5 rounded-xl border p-3">
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.key} className="flex items-center gap-1.5">
            <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">
              {i + 1}
            </span>
            {r.locked ? (
              <div className="border-input bg-muted/40 text-muted-foreground flex h-8 w-32 shrink-0 items-center rounded-md border px-3 text-sm">
                {r.dueDate}
              </div>
            ) : (
              <DatePicker
                value={r.dueDate}
                onChange={(v) => setRow(r.key, { dueDate: v })}
                className="h-8 w-32 shrink-0"
              />
            )}
            <Input
              type="number"
              min="0"
              step="0.01"
              value={r.amount}
              disabled={r.locked}
              onChange={(e) => setRow(r.key, { amount: e.target.value })}
              placeholder="Amount"
              className="h-8 w-24 shrink-0"
            />
            <Input
              value={r.label}
              disabled={r.locked}
              onChange={(e) => setRow(r.key, { label: e.target.value })}
              placeholder={`Installment ${i + 1}`}
              className="h-8 min-w-0 flex-1"
            />
            {r.locked ? (
              <span className="rounded bg-emerald-100 px-1.5 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                paid
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => removeRow(r.key)}
                disabled={rows.length === 1}
                aria-label="Remove installment"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-2.5">
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="xs" onClick={addRow}>
            <Plus className="size-4" /> Add
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={splitEven}>
            Split evenly
          </Button>
        </div>
        <span className="text-sm font-medium tabular-nums">
          Total <span className="text-foreground font-semibold">{formatCurrency(total)}</span>
        </span>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="xs" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="button" size="xs" onClick={submit} disabled={!canSave || save.isPending}>
          {save.isPending ? "Saving…" : "Save plan"}
        </Button>
      </div>
    </div>
  )
}

export const INSTALLMENT_STATUS_TONE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  DUE: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  OVERDUE: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  UPCOMING: "bg-muted text-muted-foreground",
}

export function statusTone(status: string) {
  return cn("rounded px-1.5 py-0.5 text-[10px] font-medium", INSTALLMENT_STATUS_TONE[status])
}
