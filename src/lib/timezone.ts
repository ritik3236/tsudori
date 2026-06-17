// Product timezone. All user-facing dates are interpreted and displayed in this
// timezone. Change this one constant to adapt the product for a different region.
export const APP_TIMEZONE = "Asia/Kolkata"

// Fixed UTC offset in milliseconds — valid because IST has no DST.
export const APP_TZ_OFFSET_MS = (5 * 60 + 30) * 60 * 1000

// Convert a YYYY-MM-DD date string selected in the app timezone to a UTC Date.
// e.g. "2026-06-17" → 2026-06-16T18:30:00.000Z
export function appDateToUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) - APP_TZ_OFFSET_MS)
}

// Convert a UTC Date to a YYYY-MM-DD string in the app timezone.
// e.g. 2026-06-16T18:30:00Z → "2026-06-17"
export function utcToAppDateStr(d: Date): string {
  return new Date(d.getTime() + APP_TZ_OFFSET_MS).toISOString().slice(0, 10)
}

// IST midnight boundaries for a given YYYY-MM-DD date string.
// Returns [dayStart, dayEnd) as UTC timestamps.
export function appDayBounds(dateStr: string): [Date, Date] {
  const start = appDateToUtc(dateStr)
  return [start, new Date(start.getTime() + 86_400_000)]
}

// IST midnight boundaries for a given YYYY-MM month string.
// Returns [monthStart, monthEnd) as UTC timestamps.
export function appMonthBounds(monthStr: string): [Date, Date] {
  const [y, m] = monthStr.split("-").map(Number)
  const start = appDateToUtc(`${y}-${String(m).padStart(2, "0")}-01`)
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const end = appDateToUtc(`${nextY}-${String(nextM).padStart(2, "0")}-01`)
  return [start, end]
}

// Current date string in the app timezone (YYYY-MM-DD).
export function todayInAppTz(): string {
  return utcToAppDateStr(new Date())
}
