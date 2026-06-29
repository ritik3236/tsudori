// All WhatsApp click-to-chat code in one place: pure helpers (no hooks, no
// "server-only"), the message templates, the brand glyph, and a reusable icon
// link. Shared across fees + attendance; safe in both server and client trees.

import { cn } from "@/lib/utils"

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

/**
 * India click-to-chat needs "91" + the 10-digit mobile. Strip non-digits, drop
 * any existing country code / leading zero, keep the last 10. Returns null when
 * it isn't a usable 10-digit number (callers then hide/disable the button).
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  const local = digits.length > 10 ? digits.slice(-10) : digits
  return local.length === 10 ? `91${local}` : null
}

export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

// ─── Message templates ────────────────────────────────────────────────────────

/** Fee received confirmation — sent against a payment, optionally noting a
 *  concession (waiver) applied to the same month. */
export function feeReceivedMessage(p: {
  studentName: string
  amount: number
  waived?: number
  receiptNo: number
  date: string // pre-formatted, e.g. "19 Jun 2026"
  institutionName: string
}): string {
  const lines = [
    "Dear Parent,",
    "",
    `We have received the fee payment for ${p.studentName}.`,
    "",
    `Amount Paid: ${inr(p.amount)}`,
  ]
  if (p.waived && p.waived > 0) lines.push(`Concession: ${inr(p.waived)}`)
  lines.push(
    `Receipt No: ${p.receiptNo}`,
    `Date: ${p.date}`,
    "",
    "Thank you for your payment.",
    "",
    "Regards,",
    p.institutionName
  )
  return lines.join("\n")
}

/** Fee reminder — sent to parents who still owe for the month, noting any
 *  concession already applied. */
export function feeReminderMessage(p: {
  studentName: string
  pending: number
  waived?: number
  monthLabel: string // e.g. "May 2026"
  institutionName: string
}): string {
  const lines = [
    "Dear Parent,",
    "",
    `This is a gentle reminder that the fee for ${p.studentName} is pending.`,
    "",
    `Amount Due: ${inr(p.pending)}`,
  ]
  if (p.waived && p.waived > 0) lines.push(`Concession Applied: ${inr(p.waived)}`)
  lines.push(
    `Month: ${p.monthLabel}`,
    "",
    "Kindly clear the dues at your earliest convenience.",
    "",
    "Regards,",
    p.institutionName
  )
  return lines.join("\n")
}

/** Fee concession confirmation — sent when the month is settled by a waiver
 *  alone (no cash due, so there's no receipt). */
export function feeWaivedMessage(p: {
  studentName: string
  waived: number
  monthLabel: string // e.g. "May 2026"
  institutionName: string
}): string {
  return [
    "Dear Parent,",
    "",
    `A fee concession has been applied for ${p.studentName}.`,
    "",
    `Concession: ${inr(p.waived)}`,
    `Month: ${p.monthLabel}`,
    "",
    "No payment is required for this month.",
    "",
    "Regards,",
    p.institutionName,
  ].join("\n")
}

/** Attendance notification — sent when a student is marked absent / on leave. */
export function attendanceAbsenceMessage(p: {
  studentName: string
  status: "ABSENT" | "LEAVE"
  date: string // pre-formatted, e.g. "20 Jun 2026"
  institutionName: string
}): string {
  const what = p.status === "LEAVE" ? "on leave" : "absent"
  return [
    "Dear Parent,",
    "",
    `Your child ${p.studentName} from ${p.institutionName} was marked ${what} on ${p.date}.`,
    "",
    "Please contact us if this is incorrect.",
    "",
    "Regards,",
    p.institutionName,
  ].join("\n")
}

// ─── UI ───────────────────────────────────────────────────────────────────────

/** WhatsApp brand glyph. Pure SVG (no hooks) → renders in server + client. */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/**
 * Compact green icon link to a wa.me URL — fee list rows, attendance rows, etc.
 * Pass `href={null}` to render the icon greyed-out and disabled (e.g. when the
 * parent has no phone number); `disabledTitle` explains why on hover.
 */
export function WhatsAppIconLink({
  href,
  title,
  disabledTitle = "No contact number",
  className,
}: {
  href: string | null
  title?: string
  disabledTitle?: string
  className?: string
}) {
  if (!href) {
    return (
      <span
        aria-label={disabledTitle}
        aria-disabled="true"
        title={disabledTitle}
        className={cn(
          "bg-muted text-muted-foreground/40 inline-flex size-8 shrink-0 cursor-not-allowed items-center justify-center rounded-md",
          className
        )}
      >
        <WhatsAppGlyph className="size-4" />
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Send on WhatsApp"
      title={title}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[#25D366]/10 text-[#25D366] transition-colors hover:bg-[#25D366]/20",
        className
      )}
    >
      <WhatsAppGlyph className="size-4" />
    </a>
  )
}
