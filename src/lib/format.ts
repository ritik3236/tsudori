// Non-date formatting (currency, numbers, initials).
// Date/timezone formatting lives in src/lib/date-helper.ts.

const DEFAULT_LOCALE = "en-IN"
const DEFAULT_CURRENCY = "INR"

type Numeric = number | string | { toString(): string }

function toNumber(value: Numeric): number {
  return typeof value === "number" ? value : Number(value.toString())
}

/** ₹12,34,567 — Indian digit grouping, whole rupees (no trailing .00). */
export function formatCurrency(
  value: Numeric,
  opts: { locale?: string; currency?: string; compact?: boolean } = {}
): string {
  const amount = toNumber(value)
  if (Number.isNaN(amount)) return "—"
  return new Intl.NumberFormat(opts.locale ?? DEFAULT_LOCALE, {
    style: "currency",
    currency: opts.currency ?? DEFAULT_CURRENCY,
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(amount)
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

// Re-export date helpers so existing imports from "@/lib/format" keep working.
export {
  formatDateShort,
  formatDateLong,
  toDateInputValue,
} from "@/lib/date-helper"
