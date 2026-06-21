"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"

import { formatDateLong, formatMonthLabel, shiftMonthStr, todayInAppTz } from "@/lib/date-helper"
import {
  useDeleteHoliday,
  useHolidays,
  useUpsertHoliday,
} from "@/features/attendance/hooks"
import type { HolidayKind } from "@/features/attendance/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Props = {
  /** Omit for institute-wide holidays; pass a class id for class-specific ones. */
  classId?: string
}

/** Month-scoped add/list/remove of holidays + working-day overrides. Reused by
 *  the institute settings page (no classId) and the per-class config. */
export function HolidayManager({ classId }: Props) {
  const [month, setMonth] = useState(() => todayInAppTz().slice(0, 7))
  const { data: holidays, isLoading } = useHolidays(month, classId)
  const upsert = useUpsertHoliday()
  const del = useDeleteHoliday()

  const [date, setDate] = useState(() => todayInAppTz())
  const [name, setName] = useState("")
  const [kind, setKind] = useState<HolidayKind>("OFF")

  const add = () => {
    if (!date) return
    upsert.mutate(
      { date, kind, name: name.trim() || null, classId: classId ?? null },
      { onSuccess: () => setName("") }
    )
  }

  return (
    <div className="space-y-3">
      {/* Month nav */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setMonth((m) => shiftMonthStr(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="w-28 text-center text-sm font-medium">{formatMonthLabel(month)}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setMonth((m) => shiftMonthStr(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Add */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border p-3">
        <div className="w-40">
          <label className="text-muted-foreground mb-1 block text-xs">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="min-w-[8rem] flex-1">
          <label className="text-muted-foreground mb-1 block text-xs">Name (optional)</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali" />
        </div>
        <div className="w-40">
          <label className="text-muted-foreground mb-1 block text-xs">Type</label>
          <Select value={kind} onValueChange={(v) => setKind(v as HolidayKind)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => (v === "OFF" ? "Holiday (closed)" : "Working day")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OFF">Holiday (closed)</SelectItem>
              <SelectItem value="WORKING">Working day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={add} disabled={upsert.isPending || !date}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : holidays && holidays.length > 0 ? (
        <div className="divide-y rounded-xl border">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-sm font-medium tabular-nums">{formatDateLong(h.date)}</span>
              <Badge variant={h.kind === "OFF" ? "secondary" : "outline"}>
                {h.kind === "OFF" ? "Holiday" : "Working"}
              </Badge>
              {h.name && (
                <span className="text-muted-foreground truncate text-sm">{h.name}</span>
              )}
              <button
                type="button"
                onClick={() => del.mutate(h.id)}
                disabled={del.isPending}
                className="text-muted-foreground hover:text-destructive ml-auto disabled:opacity-60"
                aria-label="Remove holiday"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-sm">
          No holidays this month.
        </p>
      )}
    </div>
  )
}
