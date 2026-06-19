// Pure helpers for the WhatsApp click-to-chat links (no DB, no "server-only"),
// shared by the receipt page (server) and the fees list rows (client).

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

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

/** "Fee Received Confirmation" — sent against a specific receipt/payment. */
export function feeReceivedMessage(p: {
  studentName: string
  amount: number
  receiptNo: number
  date: string // pre-formatted, e.g. "19 Jun 2026"
  institutionName: string
}): string {
  return [
    "Dear Parent,",
    "",
    `We have received the fee payment for ${p.studentName}.`,
    "",
    `Amount: ${inr(p.amount)}`,
    `Receipt No: ${p.receiptNo}`,
    `Date: ${p.date}`,
    "",
    "Thank you for your payment.",
    "",
    "Regards,",
    p.institutionName,
  ].join("\n")
}

/** "Fee Reminder" — sent to parents who still owe for the month. */
export function feeReminderMessage(p: {
  studentName: string
  pending: number
  monthLabel: string // e.g. "May 2026"
  institutionName: string
}): string {
  return [
    "Dear Parent,",
    "",
    `This is a gentle reminder that the fee for ${p.studentName} is pending.`,
    "",
    `Amount Due: ${inr(p.pending)}`,
    `Month: ${p.monthLabel}`,
    "",
    "Kindly clear the dues at your earliest convenience.",
    "",
    "Regards,",
    p.institutionName,
  ].join("\n")
}
