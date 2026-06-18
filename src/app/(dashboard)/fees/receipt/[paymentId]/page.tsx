import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError } from "@/lib/errors"
import { formatCurrency, formatDateLong } from "@/lib/format"
import { getReceipt } from "@/features/fees/service"
import { METHOD_LABELS } from "@/features/fees/schema"
import { BackLink } from "@/components/shared/back-link"
import { PrintButton } from "@/features/fees/components/print-button"

export const metadata: Metadata = { title: "Receipt" }

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

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>
}) {
  const { paymentId } = await params
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.FEE_READ)

  let receipt: Awaited<ReturnType<typeof getReceipt>>
  try {
    receipt = await getReceipt(ctx.institute.id, paymentId)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  const address = [receipt.institute.addressLine, receipt.institute.city]
    .filter(Boolean)
    .join(", ")
  const contact = [receipt.institute.phone, receipt.institute.email]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <BackLink href="/fees" label="Fees" />
        <PrintButton />
      </div>

      <div className="bg-card rounded-2xl border p-6 print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              {receipt.institute.name}
            </h1>
            {address && <p className="text-muted-foreground text-xs">{address}</p>}
            {contact && <p className="text-muted-foreground text-xs">{contact}</p>}
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Receipt</p>
            <p className="font-semibold tabular-nums">#{receipt.receiptNo}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 py-4 text-sm">
          <Row
            label="Student"
            value={`${receipt.student.fullName} (ID ${receipt.student.serialNo})`}
          />
          <Row label="Class" value={receipt.student.className ?? "—"} />
          <Row label="Date" value={formatDateLong(receipt.paidAt)} />
          <Row label="Method" value={METHOD_LABELS[receipt.method]} />
          {receipt.periodMonth && (
            <Row
              label="For"
              value={`${MONTHS[receipt.periodMonth - 1]} ${receipt.periodYear}`}
            />
          )}
          {receipt.recordedBy && <Row label="Recorded by" value={receipt.recordedBy} />}
        </dl>

        {receipt.note && (
          <p className="text-muted-foreground border-t pt-3 text-sm italic">
            {receipt.note}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
          <span className="text-sm font-medium">Amount paid</span>
          <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatCurrency(receipt.amount)}
          </span>
        </div>

        <p className="text-muted-foreground mt-5 text-center text-xs">
          This is a computer-generated receipt.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}
