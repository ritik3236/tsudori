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
          Payment history
        </h2>
        {fee.payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description="Recorded payments will show up here with their receipts."
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border">
            <ul className="divide-y">
              {fee.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(p.amount)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateLong(p.paidAt)} · {METHOD_LABELS[p.method]} · #
                      {p.receiptNo}
                      {p.periodMonth
                        ? ` · ${MONTHS[p.periodMonth - 1]} ${p.periodYear}`
                        : ""}
                    </p>
                    {p.note && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                        {p.note}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/fees/receipt/${p.id}`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
                  >
                    <Printer className="size-3.5" /> Receipt
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {fee.waivers.length > 0 && (
        <div>
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">
            Concessions
          </h2>
          <div className="bg-card overflow-hidden rounded-xl border">
            <ul className="divide-y">
              {fee.waivers.map((w) => (
                <li key={w.id} className="flex items-center gap-3 p-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <HandCoins className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(w.amount)} waived
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {MONTHS[w.periodMonth - 1]} {w.periodYear} ·{" "}
                      {formatDateLong(w.createdAt)}
                      {w.waivedBy ? ` · ${w.waivedBy}` : ""}
                    </p>
                    {w.reason && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                        {w.reason}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
