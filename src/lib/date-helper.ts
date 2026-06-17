import { DateTime } from "luxon"

// Product timezone — change this one constant to ship for a different region.
export const APP_TIMEZONE = "Asia/Kolkata"

// ─── Core converters ─────────────────────────────────────────────────────────

// Parse YYYY-MM-DD as app-timezone midnight and return a UTC JS Date.
// "2026-06-17" IST → 2026-06-16T18:30:00.000Z
export function appDateToUtc(dateStr: string): Date {
  return DateTime.fromISO(dateStr, { zone: APP_TIMEZONE }).toJSDate()
}

// Convert a UTC JS Date to a YYYY-MM-DD string in the app timezone.
// 2026-06-16T18:30:00Z → "2026-06-17"
export function utcToAppDateStr(d: Date): string {
  return DateTime.fromJSDate(d, { zone: APP_TIMEZONE }).toISODate()!
}

// Current date string in the app timezone.
export function todayInAppTz(): string {
  return DateTime.now().setZone(APP_TIMEZONE).toISODate()!
}

// ─── Boundary helpers ─────────────────────────────────────────────────────────

// [dayStart, dayEnd) as UTC timestamps for a YYYY-MM-DD date in the app timezone.
export function appDayBounds(dateStr: string): [Date, Date] {
  const start = DateTime.fromISO(dateStr, { zone: APP_TIMEZONE }).startOf("day")
  return [start.toJSDate(), start.plus({ days: 1 }).toJSDate()]
}

// [monthStart, monthEnd) as UTC timestamps for a YYYY-MM month in the app timezone.
export function appMonthBounds(monthStr: string): [Date, Date] {
  const start = DateTime.fromISO(`${monthStr}-01`, { zone: APP_TIMEZONE }).startOf("month")
  return [start.toJSDate(), start.plus({ months: 1 }).toJSDate()]
}

// ─── Display formatters ───────────────────────────────────────────────────────

type DateInput = Date | string | number | null | undefined

function toAppDT(value: DateInput): DateTime | null {
  if (value == null) return null
  let dt: DateTime
  if (value instanceof Date) {
    dt = DateTime.fromJSDate(value, { zone: APP_TIMEZONE })
  } else if (typeof value === "number") {
    dt = DateTime.fromMillis(value, { zone: APP_TIMEZONE })
  } else {
    dt = DateTime.fromISO(value, { zone: APP_TIMEZONE })
  }
  return dt.isValid ? dt : null
}

// 17/06/2026
export function formatDateShort(value: DateInput): string {
  return toAppDT(value)?.toFormat("dd/MM/yyyy") ?? "—"
}

// 17 Jun 2026
export function formatDateLong(value: DateInput): string {
  return toAppDT(value)?.toFormat("dd MMM yyyy") ?? "—"
}

// 17 Jun 2026, 3:45 PM
export function formatDateTime(value: DateInput): string {
  return toAppDT(value)?.toFormat("dd MMM yyyy, h:mm a") ?? "—"
}

// "just now" / "5m ago" / "3h ago" / "2d ago", falling back to a date past a week.
// For feeds and activity lists. All arithmetic goes through Luxon, not native Date.
export function formatRelative(value: DateInput): string {
  const dt = toAppDT(value)
  if (!dt) return "—"
  const mins = Math.floor(DateTime.now().diff(dt, "minutes").minutes)
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
