"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Receipt, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { FILTER_ALL as ALL, MONTHS_SHORT as MONTHS } from "@/lib/constants"
import { formatClassName, formatCurrency, formatDateLong } from "@/lib/format"
import { appYearMonth, appMonthStartUtc, nowDate } from "@/lib/date-helper"
import {
  useFeeMonthSummary,
  useFeeOverview,
  useStudentFees,
} from "@/features/fees/hooks"
import { useClassOptions } from "@/features/students/hooks"
import type { FeeStatus, StudentFeeListItem } from "@/features/fees/types"
import {
  feeReceivedMessage,
  feeReminderMessage,
  feeWaivedMessage,
  toWhatsAppNumber,
  whatsappUrl,
  WhatsAppIconLink,
} from "@/lib/whatsapp"
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
  const { year, month } = appYearMonth(nowDate())
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
  instituteName,
}: {
  canRecord: boolean
  canWaive: boolean
  instituteName: string
}) {
  const nowYM = appYearMonth(nowDate())
  const [sel, setSel] = useState({ month: nowYM.month, year: nowYM.year })
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [classId, setClassId] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
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

  // "Pending" filters to whoever still owes; the settled statuses (paid / waived
  // / advance) map straight to the exact status filter.
  const pendingOnly = statusFilter === "PENDING"
  const statusParam: FeeStatus | undefined =
    statusFilter === "PAID" || statusFilter === "WAIVED" ? statusFilter : undefined

  // The student list itself: infinite scroll, ordered who-owes-first then name.
  const { items, isLoading, isPlaceholder, hasMore, loadMore, isLoadingMore } =
    useStudentFees({
      periodMonth: sel.month,
      periodYear: sel.year,
      classId: classFilter,
      q: q || undefined,
      status: statusParam,
      pendingOnly: pendingOnly || undefined,
    })

  const nowOrd = nowYM.year * 12 + nowYM.month
  const searching = q.length > 0
  // Counts/subtotals come from the whole-month summary, so they're only exact for
  // the shown rows when the list isn't narrowed to a subset (search / a settled status).
  const narrowed = searching || statusParam !== undefined

  const expected = summary?.expectedThisMonth ?? 0
  const collected = summary?.collectedThisMonth ?? 0
  const outstanding = summary?.pendingThisMonth ?? 0
  const waived = summary?.waivedThisMonth ?? 0
  const paidCount = summary?.paidCount ?? 0
  const pendingCount = summary?.pendingCount ?? 0
  const totalStudents = summary?.totalStudents ?? 0
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0

  // The list arrives pending-first (UNPAID/PARTIAL rank before settled), so the
  // split is contiguous — group it into Pending vs Settled for subtotal headers.
  const pendingItems = items.filter((s) => s.pendingThisMonth > 0)
  const settledItems = items.filter((s) => s.pendingThisMonth <= 0)
  const monthLabel = `${MONTHS[sel.month - 1]} ${sel.year}`

  // Settled subtotal: cash collected + concession waived (whichever apply).
  const settledSubtotal: ReactNode =
    collected > 0 || waived > 0 ? (
      <span className="tabular-nums">
        {collected > 0 && (
          <span className="text-emerald-600 dark:text-emerald-400">
            {formatCurrency(collected)} in
          </span>
        )}
        {collected > 0 && waived > 0 && (
          <span className="text-muted-foreground"> · </span>
        )}
        {waived > 0 && (
          <span className="text-indigo-600 dark:text-indigo-300">
            {formatCurrency(waived)} waived
          </span>
        )}
      </span>
    ) : undefined

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
                "shrink-0 rounded-lg border px-2.5 py-1 text-left leading-tight transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted/50 text-foreground"
              )}
            >
              <div className="text-xs font-medium">{MONTHS[m.month - 1]}</div>
              <div
                className={cn(
                  "text-[11px] tabular-nums",
                  active ? "text-white/85" : "text-muted-foreground"
                )}
              >
                {sub}
              </div>
            </button>
          )
        })}
      </div>

      {/* Search on its own row; status + class share the row below. */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            className="h-8 pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "ALL")}
          >
            <SelectTrigger className="w-full data-[size=default]:h-8">
              <SelectValue placeholder="Status">
                {(v: string) =>
                  STATUS_FILTER_OPTIONS.find((o) => o.value === v)?.label ?? "All status"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classId} onValueChange={(v) => setClassId(v ?? ALL)}>
            <SelectTrigger className="w-full data-[size=default]:h-8">
              <SelectValue placeholder="Class">
                {(v: string) =>
                  v === ALL
                    ? "All classes"
                    : (() => {
                        const c = classes?.find((c) => c.id === v)
                        return c ? formatClassName(c.name, c.section) : "Class"
                      })()
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {(classes ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {formatClassName(c.name, c.section)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Slim month headline — collected vs expected + a thin progress bar. The
          per-group subtotals below carry the due / collected / waived breakdown,
          so this stays light instead of a full summary card. */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm tabular-nums">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(collected)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              collected of {formatCurrency(expected)}
            </span>
          </span>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {paidCount}/{totalStudents} settled
          </span>
        </div>
        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${pct}%` }}
          />
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
          title={
            searching
              ? "No matches"
              : statusFilter === "PENDING"
                ? "All caught up"
                : statusFilter !== "ALL"
                  ? "Nothing here"
                  : "No students"
          }
          description={
            searching
              ? "No students match your search."
              : statusFilter === "PENDING"
                ? "No pending fees this month."
                : statusFilter !== "ALL"
                  ? "No students with this status this month."
                  : "Add students to start tracking fees."
          }
        />
      ) : (
        <div className={cn("space-y-5", isPlaceholder && "opacity-60")}>
          {pendingItems.length > 0 && (
            <section className="space-y-2.5">
              <SectionHeader
                label="Pending"
                dot="bg-amber-500"
                count={narrowed ? undefined : pendingCount}
                subtotal={
                  narrowed ? undefined : (
                    <span className="tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCurrency(outstanding)} due
                    </span>
                  )
                }
              />
              <div className="divide-y">
                {pendingItems.map((s) => (
                  <Row
                    key={s.studentId}
                    s={s}
                    canRecord={canRecord}
                    canWaive={canWaive}
                    monthLabel={monthLabel}
                    instituteName={instituteName}
                  />
                ))}
              </div>
            </section>
          )}
          {settledItems.length > 0 && (
            <section className="space-y-2.5">
              <SectionHeader
                label="Settled"
                dot="bg-emerald-500"
                count={narrowed ? undefined : paidCount}
                subtotal={narrowed ? undefined : settledSubtotal}
              />
              <div className="divide-y">
                {settledItems.map((s) => (
                  <Row
                    key={s.studentId}
                    s={s}
                    canRecord={canRecord}
                    canWaive={canWaive}
                    monthLabel={monthLabel}
                    instituteName={instituteName}
                  />
                ))}
              </div>
            </section>
          )}
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

// Status filter — "Pending" is the owes-this-month umbrella (UNPAID/PARTIAL via
// pendingOnly); the rest map to an exact FeeStatus.
type StatusFilter = "ALL" | "PENDING" | "PAID" | "WAIVED"
const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All status" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "WAIVED", label: "Waived" },
]

function SectionHeader({
  label,
  count,
  dot,
  subtotal,
  className,
}: {
  label: string
  count?: number
  dot: string
  subtotal?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("size-2 rounded-full", dot)} />
      <h2 className="text-sm font-medium">{label}</h2>
      {count !== undefined && (
        <span className="text-muted-foreground text-xs">· {count}</span>
      )}
      {subtotal !== undefined && (
        <span className="ml-auto text-xs font-medium">{subtotal}</span>
      )}
    </div>
  )
}

function Row({
  s,
  canRecord,
  canWaive,
  monthLabel,
  instituteName,
}: {
  s: StudentFeeListItem
  canRecord: boolean
  canWaive: boolean
  monthLabel: string
  instituteName: string
}) {
  const router = useRouter()

  // WhatsApp: a reminder when they still owe, a payment confirmation when paid
  // (noting any concession), or a concession note when settled by waiver alone.
  // Each message carries the waived amount so the parent sees the full picture.
  const waNumber = toWhatsAppNumber(s.contactNumber)
  let waUrl: string | null = null
  if (waNumber) {
    if (s.pendingThisMonth > 0) {
      waUrl = whatsappUrl(
        waNumber,
        feeReminderMessage({
          studentName: s.fullName,
          pending: s.pendingThisMonth,
          waived: s.waivedThisMonth,
          monthLabel,
          institutionName: instituteName,
        })
      )
    } else if (s.lastReceipt) {
      waUrl = whatsappUrl(
        waNumber,
        feeReceivedMessage({
          studentName: s.fullName,
          amount: s.lastReceipt.amount,
          waived: s.waivedThisMonth,
          receiptNo: s.lastReceipt.receiptNo,
          date: formatDateLong(s.lastReceipt.paidAt),
          institutionName: instituteName,
        })
      )
    } else if (s.waivedThisMonth > 0) {
      // Settled by concession alone — no cash, no receipt.
      waUrl = whatsappUrl(
        waNumber,
        feeWaivedMessage({
          studentName: s.fullName,
          waived: s.waivedThisMonth,
          monthLabel,
          institutionName: instituteName,
        })
      )
    }
  }

  // No number → disabled "No contact number" icon so the gap is explained, not
  // a silent blank. With a number + something to send → active link. With a
  // number but nothing to send (paid, no receipt) → no icon.
  const waIcon = !waNumber ? (
    <WhatsAppIconLink href={null} />
  ) : waUrl ? (
    <WhatsAppIconLink
      href={waUrl}
      title={
        s.pendingThisMonth > 0
          ? "Send fee reminder on WhatsApp"
          : s.paidThisMonth > 0
            ? "Send payment confirmation on WhatsApp"
            : "Send concession note on WhatsApp"
      }
    />
  ) : null

  // Amount in this month's status colour — kept on one line with the actions so
  // each student is a single dense row (a 60-student class stays scannable).
  const amountColor =
    s.advance > 0 || s.paidThisMonth > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : s.pendingThisMonth > 0
        ? "text-amber-600 dark:text-amber-400"
        : s.waivedThisMonth > 0
          ? "text-indigo-600 dark:text-indigo-300"
          : "text-emerald-600 dark:text-emerald-400"
  const amountText =
    s.advance > 0
      ? `+${formatCurrency(s.advance)}`
      : s.pendingThisMonth > 0
        ? formatCurrency(s.pendingThisMonth)
        : s.paidThisMonth > 0
          ? formatCurrency(s.paidThisMonth)
          : s.waivedThisMonth > 0
            ? `${formatCurrency(s.waivedThisMonth)} waived`
            : formatCurrency(s.paidThisMonth)

  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
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
          {s.className ? formatClassName(s.className, s.classSection) : "No class"} ·{" "}
          {STATUS_LABEL[s.status]}
          {/* Show the concession alongside the status, except when fully waived —
              there the amount column already reads "₹X waived", so it'd repeat. */}
          {s.waivedThisMonth > 0 && s.status !== "WAIVED" && (
            <span className="text-indigo-600 dark:text-indigo-300">
              {" "}
              · {formatCurrency(s.waivedThisMonth)} waived
            </span>
          )}
        </div>
      </Link>
      <span className={cn("shrink-0 text-sm font-semibold tabular-nums", amountColor)}>
        {amountText}
      </span>
      {/* WhatsApp (reminder/confirmation) + Record. Waiving is done from the
          student's fee detail page; the month view only records payments. */}
      {(waIcon || (canRecord && s.pendingThisMonth > 0)) && (
        <div className="flex shrink-0 items-center gap-1">
          {waIcon}
          {canRecord && s.pendingThisMonth > 0 && (
            <RecordPaymentButton
              studentId={s.studentId}
              studentName={s.fullName}
              monthlyFee={s.monthlyFee}
              remainingDue={s.pendingThisMonth}
              canWaive={canWaive}
              label="Record"
              variant="outline"
              size="sm"
              className="h-8 sm:h-8"
            />
          )}
        </div>
      )}
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
