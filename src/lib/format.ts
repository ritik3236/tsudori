// Locale-aware formatting. Defaults match an Indian institute (₹, lakh grouping,
// DD/MM/YYYY) but every helper accepts a locale/currency override so a future
// multi-region tenant can pass its own from the Institute record.

import { format as formatDate, isValid } from "date-fns"

const DEFAULT_LOCALE = "en-IN"
const DEFAULT_CURRENCY = "INR"

type Numeric = number | string | { toString(): string }

function toNumber(value: Numeric): number {
  return typeof value === "number" ? value : Number(value.toString())
}

/** ₹12,34,567.00 — Indian digit grouping by default. */
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
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(value: Numeric, locale = DEFAULT_LOCALE): string {
  const n = toNumber(value)
  return Number.isNaN(n) ? "—" : new Intl.NumberFormat(locale).format(n)
}

function asDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  return isValid(d) ? d : null
}

/** 16/06/2026 */
export function formatDateShort(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  return d ? formatDate(d, "dd/MM/yyyy") : "—"
}

/** 16 Jun 2026 */
export function formatDateLong(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  return d ? formatDate(d, "dd MMM yyyy") : "—"
}

/** 16 Jun 2026, 3:45 PM */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  return d ? formatDate(d, "dd MMM yyyy, h:mm a") : "—"
}

/** ISO yyyy-MM-dd, for date inputs and API params. */
export function toDateInputValue(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  return d ? formatDate(d, "yyyy-MM-dd") : ""
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
