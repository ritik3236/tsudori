// Pure resolution of whether a date is a *working day* for attendance, layering
// institute + class rules. No DB and no timezone work here — callers pass the
// app-tz weekday and any matching holiday rulings (the data-loading side lives in
// src/features/attendance/holiday-service.ts). Kept pure so it's unit-testable.

export type HolidayKind = "OFF" | "WORKING"

/** Default institute weekly-off when nothing is configured: Sunday (Luxon 7). */
export const DEFAULT_WEEKLY_OFF: number[] = [7]

/** A holiday row that matched a date (institute-wide or class-specific). */
export type Ruling = { kind: HolidayKind; name: string | null }

export type WorkingDayReason = "open" | "weekly-off" | "holiday" | "extra-class"

export type WorkingDay = {
  working: boolean
  reason: WorkingDayReason
  /** Holiday/override name when one was set; else null. */
  name: string | null
}

/**
 * Resolve a single date. Precedence, most specific first:
 *   1. class-specific ruling   2. institute-wide ruling
 *   3. effective weekly-off    4. otherwise open.
 * A dated ruling always beats the weekly pattern — that single rule covers
 * public/custom holidays, weekly offs, and "extra class on a Sunday" overrides.
 */
export function resolveWorkingDay(input: {
  weekday: number // 1=Mon … 7=Sun (Luxon), in app tz
  weeklyOff: number[] // effective weekly-off weekdays
  classRuling?: Ruling | null
  instituteRuling?: Ruling | null
}): WorkingDay {
  const ruling = input.classRuling ?? input.instituteRuling ?? null
  if (ruling) {
    return ruling.kind === "OFF"
      ? { working: false, reason: "holiday", name: ruling.name }
      : { working: true, reason: "extra-class", name: ruling.name }
  }
  if (input.weeklyOff.includes(input.weekday)) {
    return { working: false, reason: "weekly-off", name: null }
  }
  return { working: true, reason: "open", name: null }
}

/** Effective weekly-off for a class: its override if set, else the institute default. */
export function effectiveWeeklyOff(
  instituteWeeklyOff: number[],
  classOverride: number[] | null
): number[] {
  return classOverride ?? instituteWeeklyOff
}

/**
 * Coerce stored JSON (unknown) into a clean weekday array (1..7, deduped, sorted),
 * or null when absent/malformed. An explicit empty array is preserved — it means
 * "no weekly off" (a class/institute that runs every day).
 */
export function parseWeeklyOff(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null
  const days = value
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
  return Array.from(new Set(days)).sort((a, b) => a - b)
}

/** Luxon weekday number (1=Mon..7=Sun) → short label. */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
}

/** Weekdays in display order (Mon→Sun) for pickers. */
export const WEEKDAYS_IN_ORDER: number[] = [1, 2, 3, 4, 5, 6, 7]
