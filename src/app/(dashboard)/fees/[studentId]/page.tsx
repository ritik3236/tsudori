import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { HandCoins, Printer, Receipt, Undo2 } from "lucide-react"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { MONTHS_SHORT as MONTHS } from "@/lib/constants"
import { formatClassName, formatCurrency, formatDateLong } from "@/lib/format"
import { appYearMonth, nowDate } from "@/lib/date-helper"
import { makeServerQueryClient } from "@/lib/query"
import { getStudentFee } from "@/features/fees/service"
import { listEnrollments } from "@/features/enrollment/service"
import { enrollmentKeys } from "@/features/enrollment/api"
import { METHOD_LABELS } from "@/features/fees/schema"
import { BackLink } from "@/components/shared/back-link"
import { EmptyState } from "@/components/shared/empty-state"
import { FeeStatusBadge } from "@/features/fees/components/fee-status-badge"
import { RecordPaymentButton } from "@/features/fees/components/record-payment-button"
import { ReversePaymentButton } from "@/features/fees/components/reverse-payment-button"
import { ReverseWaiverButton } from "@/features/fees/components/reverse-waiver-button"
import { WaiveFeeButton } from "@/features/fees/components/waive-fee-button"
import { EnrollmentsPanel } from "@/features/enrollment/components/enrollments-panel"

export const metadata: Metadata = { title: "Student fees" }

export default async function StudentFeesPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.FEE_READ)

  let fee: Awaited<ReturnType<typeof getStudentFee>>
  try {
    fee = await getStudentFee(ctx.institute.id, studentId)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  const canRecord = can(ctx, PERMISSIONS.FEE_RECORD)
  const canWaive = can(ctx, PERMISSIONS.FEE_WAIVE)
  const canReverse = can(ctx, PERMISSIONS.FEE_REVERSE)
  const canViewEnrollments = can(ctx, PERMISSIONS.ENROLLMENT_READ)
  const canManageEnrollments = can(ctx, PERMISSIONS.ENROLLMENT_MANAGE)

  // Prefetch the enrolment ledger so the panel paints with the page (no skeleton
  // flash). Key matches EnrollmentsPanel's useEnrollments(studentId).
  const qc = makeServerQueryClient()
  if (canViewEnrollments) {
    await qc.prefetchQuery({
      queryKey: enrollmentKeys.byStudent(studentId),
      queryFn: () => listEnrollments(ctx.institute.id, studentId),
    })
  }

  const { year: periodYear, month: periodMonth } = appYearMonth(nowDate())

  // Three core KPIs — the actionable current-period figure first (advance when
  // in credit, else pending), then lifetime owed and lifetime collected. The
  // per-month status lives in the badge by the name, so no "paid this month"
  // card. A waiver total is appended only when concessions exist.
  type Kpi = { label: string; value: string; tone?: "amber" | "emerald" | "indigo" }
  const kpis: Kpi[] = [
    fee.advance > 0
      ? { label: "Advance / credit", value: formatCurrency(fee.advance), tone: "emerald" }
      : {
          label: "Pending this month",
          value: formatCurrency(fee.pendingThisMonth),
          tone: fee.pendingThisMonth > 0 ? "amber" : undefined,
        },
    {
      label: "Total outstanding",
      value: formatCurrency(fee.totalOutstanding),
      tone: fee.totalOutstanding > 0 ? "amber" : undefined,
    },
    { label: "Total paid", value: formatCurrency(fee.totalPaid) },
  ]
  if (fee.totalWaived > 0) {
    kpis.push({
      label: "Total waived",
      value: formatCurrency(fee.totalWaived),
      tone: "indigo",
    })
  }

  // The oldest month still owing (admission → now), so "Waive" can clear
  // back-dues — not just the current month. Mirrors oldest-first payment
  // backfill. Null when nothing is outstanding.
  let waiveTarget: { year: number; month: number; due: number } | null = null
  for (
    let wy = fee.admission.year, wm = fee.admission.month;
    wy < periodYear || (wy === periodYear && wm <= periodMonth);
    wm === 12 ? ((wy += 1), (wm = 1)) : (wm += 1)
  ) {
    const k = `${wy}-${wm}`
    const due = Math.max(
      0,
      fee.monthlyFee - (fee.paidByMonth[k] ?? 0) - (fee.waivedByMonth[k] ?? 0)
    )
    if (due > 0) {
      waiveTarget = { year: wy, month: wm, due }
      break
    }
  }

  // Unified audit trail: every payment, reversal, and concession, newest first,
  // each tagged with who recorded/waived/reversed it and why. A reversal row
  // (negative amount) is split out as its own "reversal" entry.
  const activity = [
    ...fee.payments.map((p) => ({
      kind: p.reversalOfId != null ? ("reversal" as const) : ("payment" as const),
      id: p.id,
      at: p.paidAt,
      amount: p.amount,
      periodMonth: p.periodMonth,
      periodYear: p.periodYear,
      method: p.method,
      detail: p.note,
      by: p.recordedBy,
      // Original payments only: how much has been reversed, and what remains.
      reversedAmount: p.reversedAmount,
      remaining: p.amount - p.reversedAmount,
    })),
    ...fee.waivers.map((w) => ({
      kind: w.reversalOfId != null ? ("waiver-reversal" as const) : ("waiver" as const),
      id: w.id,
      at: w.createdAt,
      amount: w.amount,
      periodMonth: w.periodMonth,
      periodYear: w.periodYear,
      method: null,
      detail: w.reason,
      by: w.waivedBy,
      // Original waivers only: how much has been reversed, and what remains.
      reversedAmount: w.reversedAmount,
      remaining: w.amount - w.reversedAmount,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/fees" label="Fees" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{fee.fullName}</h1>
            <FeeStatusBadge status={fee.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            ID {fee.serialNo}
            {fee.className ? ` · ${formatClassName(fee.className, fee.classSection)}` : ""}
            {fee.guardianName ? ` · ${fee.guardianName}` : ""}
            {` · `}
            <span className="text-foreground font-medium">
              {formatCurrency(fee.monthlyFee)}/mo
            </span>
          </p>
        </div>
        {/* Waive lives here; recording a payment is the floating button
            (bottom-right) only. */}
        {canWaive && waiveTarget && (
          <div className="flex gap-2">
            <WaiveFeeButton
              studentId={fee.studentId}
              studentName={fee.fullName}
              remainingDue={fee.totalOutstanding}
              periodMonth={waiveTarget.month}
              periodYear={waiveTarget.year}
              variant="outline"
              size="default"
              className="flex-1 sm:flex-none"
            />
          </div>
        )}
      </div>

      <div
        className={cn(
          "grid gap-3",
          // Three core KPIs sit in a clean 3-up; a waiver total (when present)
          // makes it four, so fall back to a 2/4 grid then.
          kpis.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
        )}
      >
        {kpis.map((k) => (
          <Stat key={k.label} label={k.label} value={k.value} tone={k.tone} />
        ))}
      </div>

      {canViewEnrollments && (
        <HydrationBoundary state={dehydrate(qc)}>
          <EnrollmentsPanel studentId={fee.studentId} canManage={canManageEnrollments} />
        </HydrationBoundary>
      )}

      {fee.oneTimeCharges.length > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-muted-foreground text-sm font-medium">One-time fees</h2>
            <span className="text-muted-foreground/70 text-[11px]">
              included in the outstanding total
            </span>
          </div>
          <div className="bg-card overflow-hidden rounded-xl border">
            <ul className="divide-y">
              {fee.oneTimeCharges.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.label}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatCurrency(c.amount)}
                      {c.paid > 0 ? ` · ${formatCurrency(c.paid)} paid` : ""}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      c.outstanding > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {c.outstanding > 0 ? `${formatCurrency(c.outstanding)} due` : "Paid"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">
          Fee activity
        </h2>
        {activity.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No fee activity yet"
            description="Payments and concessions appear here with who recorded them and when."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border">
            <ul className="divide-y">
              {activity.map((e) => (
                <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 p-3.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      e.kind === "payment" &&
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                      (e.kind === "reversal" || e.kind === "waiver-reversal") &&
                        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
                      e.kind === "waiver" &&
                        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    )}
                  >
                    {e.kind === "payment" ? (
                      <Receipt className="size-4" />
                    ) : e.kind === "waiver" ? (
                      <HandCoins className="size-4" />
                    ) : (
                      <Undo2 className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tabular-nums">
                      {e.kind === "payment" && formatCurrency(e.amount)}
                      {e.kind === "reversal" && (
                        <span className="text-rose-600 dark:text-rose-400">
                          −{formatCurrency(Math.abs(e.amount))} reversed
                        </span>
                      )}
                      {e.kind === "waiver" && `${formatCurrency(e.amount)} waived`}
                      {e.kind === "waiver-reversal" && (
                        <span className="text-rose-600 dark:text-rose-400">
                          −{formatCurrency(Math.abs(e.amount))} waiver reversed
                        </span>
                      )}
                      {(e.kind === "payment" || e.kind === "waiver") &&
                        e.reversedAmount > 0 && (
                          <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                            {e.remaining > 0
                              ? `${formatCurrency(e.reversedAmount)} reversed`
                              : "Reversed"}
                          </span>
                        )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {e.periodMonth
                        ? `${MONTHS[e.periodMonth - 1]} ${e.periodYear} · `
                        : ""}
                      {formatDateLong(e.at)}
                      {e.method ? ` · ${METHOD_LABELS[e.method]}` : ""}
                      {e.by ? ` · by ${e.by}` : ""}
                    </p>
                    {e.detail && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                        {e.detail}
                      </p>
                    )}
                  </div>
                  {e.kind === "payment" && (
                    <div className="flex shrink-0 items-center gap-1">
                      {canReverse && e.remaining > 0 && (
                        <ReversePaymentButton
                          paymentId={e.id}
                          studentName={fee.fullName}
                          remaining={e.remaining}
                        />
                      )}
                      <Link
                        href={`/fees/receipt/${e.id}`}
                        title="View receipt"
                        aria-label="View receipt"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-violet-600 transition-colors hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-500/15"
                      >
                        <Printer className="size-4" />
                      </Link>
                    </div>
                  )}
                  {e.kind === "waiver" && canWaive && e.remaining > 0 && (
                    <div className="flex shrink-0 items-center">
                      <ReverseWaiverButton
                        waiverId={e.id}
                        studentName={fee.fullName}
                        amount={e.remaining}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Primary action: floats bottom-right (mobile + desktop), like "Add class". */}
      {canRecord && (
        <RecordPaymentButton
          studentId={fee.studentId}
          studentName={fee.fullName}
          monthlyFee={fee.monthlyFee}
          remainingDue={fee.pendingThisMonth}
          canWaive={canWaive}
          allocationContext={{
            admission: fee.admission,
            paidByMonth: fee.paidByMonth,
            waivedByMonth: fee.waivedByMonth,
          }}
          size="sm"
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 rounded-full shadow-lg lg:right-6 lg:bottom-6"
        />
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "amber" | "emerald" | "indigo"
}) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-bold tracking-tight tabular-nums",
          tone === "amber" && "text-amber-600 dark:text-amber-400",
          tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
          tone === "indigo" && "text-indigo-600 dark:text-indigo-300"
        )}
      >
        {value}
      </p>
    </div>
  )
}
