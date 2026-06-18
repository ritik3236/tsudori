import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HandCoins, Printer, Receipt } from "lucide-react"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { MONTHS_SHORT as MONTHS } from "@/lib/constants"
import { formatCurrency, formatDateLong } from "@/lib/format"
import { appYearMonth } from "@/lib/date-helper"
import { getStudentFee } from "@/features/fees/service"
import { METHOD_LABELS } from "@/features/fees/schema"
import { BackLink } from "@/components/shared/back-link"
import { EmptyState } from "@/components/shared/empty-state"
import { FeeStatusBadge } from "@/features/fees/components/fee-status-badge"
import { RecordPaymentButton } from "@/features/fees/components/record-payment-button"
import { WaiveFeeButton } from "@/features/fees/components/waive-fee-button"

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
  const { year: periodYear, month: periodMonth } = appYearMonth(new Date())

  // Unified audit trail: every payment and concession, newest first, each tagged
  // with who recorded/waived it and why.
  const activity = [
    ...fee.payments.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      at: p.paidAt,
      amount: p.amount,
      periodMonth: p.periodMonth,
      periodYear: p.periodYear,
      method: p.method,
      detail: p.note,
      by: p.recordedBy,
    })),
    ...fee.waivers.map((w) => ({
      kind: "waiver" as const,
      id: w.id,
      at: w.createdAt,
      amount: w.amount,
      periodMonth: w.periodMonth,
      periodYear: w.periodYear,
      detail: w.reason,
      by: w.waivedBy,
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
            {fee.className ? ` · ${fee.className}` : ""}
            {fee.guardianName ? ` · ${fee.guardianName}` : ""}
            {` · `}
            <span className="text-foreground font-medium">
              {formatCurrency(fee.monthlyFee)}/mo
            </span>
          </p>
        </div>
        {(canRecord || canWaive) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {canWaive && fee.pendingThisMonth > 0 && (
              <WaiveFeeButton
                studentId={fee.studentId}
                studentName={fee.fullName}
                remainingDue={fee.pendingThisMonth}
                periodMonth={periodMonth}
                periodYear={periodYear}
                variant="outline"
                size="default"
                className="w-full sm:w-auto"
              />
            )}
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
                defaultMonth={periodMonth}
                defaultYear={periodYear}
                className="w-full sm:w-auto"
              />
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Total outstanding"
          value={formatCurrency(fee.totalOutstanding)}
          tone={fee.totalOutstanding > 0 ? "amber" : undefined}
        />
        <Stat label="Paid this month" value={formatCurrency(fee.paidThisMonth)} />
        {fee.advance > 0 ? (
          <Stat
            label="Advance / credit"
            value={formatCurrency(fee.advance)}
            tone="emerald"
          />
        ) : (
          <Stat
            label="Pending this month"
            value={formatCurrency(fee.pendingThisMonth)}
            tone={fee.pendingThisMonth > 0 ? "amber" : undefined}
          />
        )}
        <Stat label="Total paid" value={formatCurrency(fee.totalPaid)} />
        {fee.totalWaived > 0 && (
          <Stat
            label="Total waived"
            value={formatCurrency(fee.totalWaived)}
            tone="indigo"
          />
        )}
      </div>

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
                      e.kind === "payment"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    )}
                  >
                    {e.kind === "payment" ? (
                      <Receipt className="size-4" />
                    ) : (
                      <HandCoins className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tabular-nums">
                      {e.kind === "payment"
                        ? formatCurrency(e.amount)
                        : `${formatCurrency(e.amount)} waived`}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {e.periodMonth
                        ? `${MONTHS[e.periodMonth - 1]} ${e.periodYear} · `
                        : ""}
                      {formatDateLong(e.at)}
                      {e.kind === "payment" ? ` · ${METHOD_LABELS[e.method]}` : ""}
                      {e.by ? ` · by ${e.by}` : ""}
                    </p>
                    {e.detail && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                        {e.detail}
                      </p>
                    )}
                  </div>
                  {e.kind === "payment" && (
                    <Link
                      href={`/fees/receipt/${e.id}`}
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
                    >
                      <Printer className="size-3.5" /> Receipt
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
