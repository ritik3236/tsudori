"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Receipt, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  AVATAR_TINTS as AVATAR,
  FILTER_ALL as ALL,
  MONTHS_SHORT as MONTHS,
} from "@/lib/constants"
import { formatCurrency, getInitials } from "@/lib/format"
import { appYearMonth, appMonthStartUtc } from "@/lib/date-helper"
import { useFeeOverview, useStudentFees } from "@/features/fees/hooks"
import { useClassOptions } from "@/features/students/hooks"
import type { FeeStatus, StudentFeeListItem } from "@/features/fees/types"
import { RecordPaymentButton } from "@/features/fees/components/record-payment-button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_LABEL: Record<FeeStatus, string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  ADVANCE: "Advance",
  WAIVED: "Waived",
}

function monthStrip() {
  const { year, month } = appYearMonth(new Date())
  const arr: { month: number; year: number }[] = []
  for (let off = -5; off <= 1; off++) {
    arr.push(appYearMonth(appMonthStartUtc(year, month + off)))
  }
  return arr
}

/** ₹15.1k / ₹1.2L / ₹3Cr — short money for the month pills. */
function compact(n: number): string {
  const t = (v: number) => v.toFixed(1).replace(/\.0$/, "")
  if (n >= 1_00_00_000) return "₹" + t(n / 1_00_00_000) + "Cr"
  if (n >= 1_00_000) return "₹" + t(n / 1_00_000) + "L"
  if (n >= 1_000) return "₹" + t(n / 1_000) + "k"
  return "₹" + n
}

export function FeesMonthView({
  canRecord,
  canWaive,
}: {
  canRecord: boolean
  canWaive: boolean
}) {
  const nowYM = appYearMonth(new Date())
  const [sel, setSel] = useState({ month: nowYM.month, year: nowYM.year })
  const [q, setQ] = useState("")
  const [classId, setClassId] = useState(ALL)
  const months = monthStrip()
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [sel.month, sel.year])

  const classFilter = classId === ALL ? undefined : classId
  const { data: classes } = useClassOptions()
  const { data: overview } = useFeeOverview(classFilter)
  const { data, isLoading } = useStudentFees({
    periodMonth: sel.month,
    periodYear: sel.year,
    classId: classFilter,
    pageSize: 100,
  })
  const items = data?.items ?? []

  // Category totals (class-scoped, not affected by the text search). `items` is
  // already limited to students enrolled by the selected month. Expected is net
  // of waivers (a waived month lowers what's owed in cash); collected is cash
  // capped at that net due so it stays consistent with outstanding.
  const netDue = (i: StudentFeeListItem) => Math.max(0, i.monthlyFee - i.waivedThisMonth)
  const expected = items.reduce((s, i) => s + netDue(i), 0)
  const collected = items.reduce((s, i) => s + Math.min(i.paidThisMonth, netDue(i)), 0)
  const outstanding = items.reduce((s, i) => s + i.pendingThisMonth, 0)
  const paidCount = items.filter((i) => i.pendingThisMonth <= 0).length
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0

  // Text search filters only the visible rows, not the totals.
  const text = q.trim().toLowerCase()
  const shown = text
    ? items.filter((i) => i.fullName.toLowerCase().includes(text))
    : items
  const pending = shown.filter((i) => i.pendingThisMonth > 0)
  const paid = shown.filter((i) => i.pendingThisMonth <= 0)

  const nowOrd = nowYM.year * 12 + nowYM.month

  return (
    <div className="space-y-5">
      {/* Month switcher — each pill shows collected / expected for that month */}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {months.map((m) => {
          const active = m.month === sel.month && m.year === sel.year
          const key = `${m.year}-${m.month}`
          const future = m.year * 12 + m.month > nowOrd
          const o = overview?.byMonth[key]
          const sub = future
            ? "Upcoming"
            : o
              ? o.expected > 0
                ? `${compact(o.collected)} / ${compact(o.expected)}`
                : "No dues"
              : "—"
          return (
            <button
              key={key}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => setSel(m)}
              className={cn(
                "min-w-[104px] shrink-0 rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                active
                  ? "bg-violet-500 text-white"
                  : "bg-card hover:bg-muted/50 border text-foreground"
              )}
            >
              <div className="text-sm font-medium">{MONTHS[m.month - 1]}</div>
              <div
                className={cn(
                  "mt-0.5 text-xs tabular-nums",
                  active ? "text-white/85" : "text-muted-foreground"
                )}
              >
                {sub}
              </div>
            </button>
          )
        })}
      </div>

      {/* Student search + class filter */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student…"
            className="pl-9"
          />
        </div>
        <Select value={classId} onValueChange={(v) => setClassId(v ?? ALL)}>
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue placeholder="Class">
              {(v: string) =>
                v === ALL ? "All classes" : (classes?.find((c) => c.id === v)?.name ?? "Class")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {(classes ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Month summary */}
      <div className="bg-card rounded-2xl border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-xs">Collected</span>
          <span className="text-muted-foreground text-xs">
            of {formatCurrency(expected)}
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {formatCurrency(collected)}
        </p>
        <div className="bg-muted mt-2.5 h-2 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {formatCurrency(outstanding)} outstanding
          </span>
          <span className="text-muted-foreground">
            {paidCount}/{items.length} paid
          </span>
        </div>
      </div>

      {/* Lists */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No students"
          description="Add students to start tracking fees."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No students match your search."
        />
      ) : (
        <>
          <Group title="Pending" count={pending.length} dot="bg-rose-500">
            {pending.length > 0 ? (
              pending.map((s, i) => (
                <Row key={s.studentId} s={s} i={i} canRecord={canRecord} canWaive={canWaive} />
              ))
            ) : (
              <p className="bg-card text-muted-foreground rounded-2xl border p-4 text-center text-sm">
                Nothing pending here for {MONTHS[sel.month - 1]}.
              </p>
            )}
          </Group>
          {paid.length > 0 && (
            <Group title="Paid" count={paid.length} dot="bg-emerald-500">
              {paid.map((s, i) => (
                <Row key={s.studentId} s={s} i={i} canRecord={canRecord} canWaive={canWaive} />
              ))}
            </Group>
          )}
        </>
      )}
    </div>
  )
}

function Group({
  title,
  count,
  dot,
  children,
}: {
  title: string
  count: number
  dot: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", dot)} />
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-muted-foreground text-xs">· {count}</span>
      </div>
      {children}
    </div>
  )
}

function Row({
  s,
  i,
  canRecord,
  canWaive,
}: {
  s: StudentFeeListItem
  i: number
  canRecord: boolean
  canWaive: boolean
}) {
  const router = useRouter()
  return (
    <div className="bg-card flex items-center gap-3 rounded-2xl border p-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          AVATAR[i % AVATAR.length]
        )}
      >
        {getInitials(s.fullName)}
      </span>
      <Link
        href={`/fees/${s.studentId}`}
        className="min-w-0 flex-1"
        onMouseEnter={() => router.prefetch(`/fees/${s.studentId}`)}
        onFocus={() => router.prefetch(`/fees/${s.studentId}`)}
      >
        <div className="truncate text-sm font-medium hover:underline">
          {s.fullName}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {s.className ?? "No class"} · {STATUS_LABEL[s.status]}
          {s.waivedThisMonth > 0 && s.pendingThisMonth > 0 && (
            <span className="text-indigo-600 dark:text-indigo-300">
              {" "}
              · {formatCurrency(s.waivedThisMonth)} waived
            </span>
          )}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {s.advance > 0 ? (
          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(s.advance)}
          </span>
        ) : s.pendingThisMonth > 0 ? (
          <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            {formatCurrency(s.pendingThisMonth)}
          </span>
        ) : s.paidThisMonth > 0 ? (
          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(s.paidThisMonth)}
          </span>
        ) : s.waivedThisMonth > 0 ? (
          <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
            {formatCurrency(s.waivedThisMonth)} waived
          </span>
        ) : (
          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(s.paidThisMonth)}
          </span>
        )}
        {/* Waiving is done from the student's fee detail page, where it clears
            dues across all months oldest-first. The month view only records
            payments (the record dialog can still waive remaining dues). */}
        {canRecord && s.pendingThisMonth > 0 && (
          <div className="flex items-center gap-1">
            <RecordPaymentButton
              studentId={s.studentId}
              studentName={s.fullName}
              monthlyFee={s.monthlyFee}
              remainingDue={s.pendingThisMonth}
              canWaive={canWaive}
              label="Record"
              variant="outline"
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}
