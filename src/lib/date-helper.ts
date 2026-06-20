import { DateTime } from "luxon"

// Product timezone — change this one constant to ship for a different region.
export const APP_TIMEZONE = "Asia/Kolkata"

type DateInput = Date | string | number | null | undefined

// ─── Internal factories ─────────────────────────────────────────────────────
// The ONLY place APP_TIMEZONE is applied. Every DateTime in this module is built
// through these, so the zone lives in one spot. (Deliberately NOT a global Luxon
// default — that's process-wide mutable state and would fight a future per-
// institute timezone; explicit factories keep it scoped and legible.)

function appDT(value: Date | string | number): DateTime {
  if (value instanceof Date) return DateTime.fromJSDate(value, { zone: APP_TIMEZONE })
  if (typeof value === "number") return DateTime.fromMillis(value, { zone: APP_TIMEZONE })
  return DateTime.fromISO(value, { zone: APP_TIMEZONE })
}

function appNow(): DateTime {
  return DateTime.now().setZone(APP_TIMEZONE)
}

function appMonth(year: number, month: number): DateTime {
  // `month` is 1-indexed and may be out of range (0, 13, -4 …); Luxon normalizes
  // it via plus().
  return DateTime.fromObject({ year, month: 1, day: 1 }, { zone: APP_TIMEZONE }).plus({
    months: month - 1,
  })
}

function toAppDT(value: DateInput): DateTime | null {
  if (value == null) return null
  const dt = appDT(value)
  return dt.isValid ? dt : null
}

// ─── Core converters ─────────────────────────────────────────────────────────

// Parse YYYY-MM-DD as app-timezone midnight and return a UTC JS Date.
// "2026-06-17" IST → 2026-06-16T18:30:00.000Z
export function appDateToUtc(dateStr: string): Date {
  return appDT(dateStr).toJSDate()
}

// Convert a UTC JS Date to a YYYY-MM-DD string in the app timezone.
// 2026-06-16T18:30:00Z → "2026-06-17"
export function utcToAppDateStr(d: Date): string {
  return appDT(d).toISODate()!
}

// Current date string in the app timezone.
export function todayInAppTz(): string {
  return appNow().toISODate()!
}

// ─── Boundary helpers ─────────────────────────────────────────────────────────

// [dayStart, dayEnd) as UTC timestamps for a YYYY-MM-DD date in the app timezone.
export function appDayBounds(dateStr: string): [Date, Date] {
  const start = appDT(dateStr).startOf("day")
  return [start.toJSDate(), start.plus({ days: 1 }).toJSDate()]
}

// [monthStart, monthEnd) as UTC timestamps for a YYYY-MM month in the app timezone.
export function appMonthBounds(monthStr: string): [Date, Date] {
  const start = appDT(`${monthStr}-01`).startOf("month")
  return [start.toJSDate(), start.plus({ months: 1 }).toJSDate()]
}

// The app-timezone calendar { year, month } (month 1-indexed) for an instant.
// Use this instead of native getFullYear()/getMonth(): a date stored in UTC that
// represents an IST calendar day must read in the right month — e.g. admission
// "1 Jun" is persisted as 2026-05-31T18:30:00Z and must resolve to June, not May.
export function appYearMonth(date: Date): { year: number; month: number } {
  const dt = appDT(date)
  return { year: dt.year, month: dt.month }
}

// UTC instant at the start (00:00 app-tz) of a given month. `month` is 1-indexed
// and may be out of range (0, 13, -4 …) — it's normalized. Handy for month windows
// and "first of month" comparisons against UTC-stored dates.
export function appMonthStartUtc(year: number, month: number): Date {
  return appMonth(year, month).toJSDate()
}

// Shift a "YYYY-MM" month string by N months (pure calendar math). Use this
// instead of native Date month arithmetic so the no-native-Date lint rule holds.
export function shiftMonthStr(monthStr: string, delta: number): string {
  return appDT(`${monthStr}-01`).plus({ months: delta }).toFormat("yyyy-MM")
}

// ─── Display formatters ───────────────────────────────────────────────────────

// 17/06/2026
export function formatDateShort(value: DateInput): string {
  return toAppDT(value)?.toFormat("dd/MM/yyyy") ?? "—"
}

// 17 Jun 2026
export function formatDateLong(value: DateInput): string {
  return toAppDT(value)?.toFormat("dd MMM yyyy") ?? "—"
}

// "just now" / "5m ago" / "3h ago" / "2d ago", falling back to a date past a week.
// For feeds and activity lists. All arithmetic goes through Luxon, not native Date.
export function formatRelative(value: DateInput): string {
  const dt = toAppDT(value)
  if (!dt) return "—"
  const mins = Math.floor(appNow().diff(dt, "minutes").minutes)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return dt.toFormat("dd MMM yyyy")
}

// yyyy-MM-dd in app timezone — for date picker inputs and API params
export function toDateInputValue(value: DateInput): string {
  return toAppDT(value)?.toISODate() ?? ""
}
