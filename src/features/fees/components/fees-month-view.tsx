"use client"

import { useEffect, useRef, useState } from "react"
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
import {
  useFeeMonthSummary,
  useFeeOverview,
  useStudentFees,
} from "@/features/fees/hooks"
import { useClassOptions } from "@/features/students/hooks"
import type { StudentFeeListItem } from "@/features/fees/types"
import { RecordPaymentButton } from "@/features/fees/components/record-payment-button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [classId, setClassId] = useState(ALL)
  const [pendingOnly, setPendingOnly] = useState(false)
  const months = monthStrip()
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [sel.month, sel.year])

  // Debounce the search box into the server query so paging stays accurate.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const classFilter = classId === ALL ? undefined : classId
  const { data: classes } = useClassOptions()
  const { data: overview } = useFeeOverview(classFilter)

  // Headline totals + counts: whole month + class, independent of search/paging.
  const { data: summary } = useFeeMonthSummary({
    periodMonth: sel.month,
    periodYear: sel.year,
    classId: classFilter,
  })

  // The student list itself: infinite scroll, ordered who-owes-first then name.
  const { items, isLoading, isPlaceholder, hasMore, loadMore, isLoadingMore } =
    useStudentFees({
      periodMonth: sel.month,
      periodYear: sel.year,
      classId: classFilter,
      q: q || undefined,
      pendingOnly: pendingOnly || undefined,
    })

  const nowOrd = nowYM.year * 12 + nowYM.month
  const searching = q.length > 0

  const expected = summary?.expectedThisMonth ?? 0
  const collected = summary?.collectedThisMonth ?? 0
  const outstanding = summary?.pendingThisMonth ?? 0
  const paidCount = summary?.paidCount ?? 0
  const pendingCount = summary?.pendingCount ?? 0
  const totalStudents = summary?.totalStudents ?? 0
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0

  // The list arrives pending-first; the first paid row is where the "Paid"
  // divider goes. -1 when everything is still pending.
  const firstPaidIdx = items.findIndex((i) => i.pendingThisMonth <= 0)

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

      {/* Student search + pending filter + class filter (wraps on narrow screens) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[160px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            className="pl-9"
          />
        </div>
        <PendingFilter value={pendingOnly} onChange={setPendingOnly} />
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

      {/* Month summary — from the aggregate, so totals stay exact while the list pages */}
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
            {paidCount}/{totalStudents} paid
          </span>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={searching ? Search : Receipt}
          title={searching ? "No matches" : pendingOnly ? "All caught up" : "No students"}
          description={
            searching
              ? "No students match your search."
              : pendingOnly
                ? "No pending fees this month."
                : "Add students to start tracking fees."
          }
        />
      ) : (
        <div className={cn("space-y-2.5", isPlaceholder && "opacity-60")}>
          {items.map((s, i) => (
            <div key={s.studentId} className="space-y-2.5">
              {i === 0 && s.pendingThisMonth > 0 && (
                <SectionHeader
                  label="Pending"
                  dot="bg-rose-500"
                  count={searching ? undefined : pendingCount}
                />
              )}
              {i === firstPaidIdx && firstPaidIdx >= 0 && (
                <SectionHeader
                  label="Paid"
                  dot="bg-emerald-500"
                  count={searching ? undefined : paidCount}
                  className={i > 0 ? "pt-2" : undefined}
                />
              )}
              <Row s={s} i={i} canRecord={canRecord} canWaive={canWaive} />
            </div>
          ))}
          <InfiniteSentinel
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={loadMore}
          />
        </div>
      )}
    </div>
  )
}

/** "All / Pending" segmented control — flip the list to just who still owes. */
function PendingFilter({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="bg-muted inline-flex shrink-0 rounded-lg p-0.5 text-sm">
      {(
        [
          ["All", false],
          ["Pending", true],
        ] as const
      ).map(([label, v]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            value === v
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SectionHeader({
  label,
  count,
  dot,
  className,
}: {
  label: string
  count?: number
  dot: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("size-2 rounded-full", dot)} />
      <h2 className="text-sm font-medium">{label}</h2>
      {count !== undefined && (
        <span className="text-muted-foreground text-xs">· {count}</span>
      )}
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

const STATUS_LABEL: Record<StudentFeeListItem["status"], string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  ADVANCE: "Advance",
  WAIVED: "Waived",
}
