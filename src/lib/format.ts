// Locale-aware formatting. Defaults match an Indian institute (₹, lakh grouping,
// DD/MM/YYYY) but every helper accepts a locale/currency override so a future
// multi-region tenant can pass its own from the Institute record.

import { isValid } from "date-fns"
import { APP_TIMEZONE, APP_TZ_OFFSET_MS, utcToAppDateStr } from "@/lib/timezone"
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

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

export function formatNumber(value: Numeric, locale = DEFAULT_LOCALE): string {
  const n = toNumber(value)
  return Number.isNaN(n) ? "—" : new Intl.NumberFormat(locale).format(n)
}

function asDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  return isValid(d) ? d : null
}

function toAppDateStr(d: Date): string {
  return utcToAppDateStr(d)
}

/** 17/06/2026 — displayed in IST */
export function formatDateShort(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  if (!d) return "—"
  const [year, month, day] = toAppDateStr(d).split("-")
  return `${day}/${month}/${year}`
}

/** 17 Jun 2026 — displayed in IST */
export function formatDateLong(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  if (!d) return "—"
  const [year, month, day] = toAppDateStr(d).split("-")
  return `${day} ${MONTHS_SHORT[parseInt(month) - 1]} ${year}`
}

/** 17 Jun 2026, 3:45 PM — displayed in IST */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  if (!d) return "—"
  const [year, month, day] = toAppDateStr(d).split("-")
  const time = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d)
  return `${day} ${MONTHS_SHORT[parseInt(month) - 1]} ${year}, ${time}`
}

/** ISO yyyy-MM-dd in IST, for date inputs and API params. */
export function toDateInputValue(value: Date | string | number | null | undefined): string {
  const d = asDate(value)
  return d ? toAppDateStr(d) : ""
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
