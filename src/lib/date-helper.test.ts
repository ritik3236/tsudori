import { describe, it, expect } from "vitest"

import { appYearMonth, appMonthStartUtc, shiftMonthStr } from "@/lib/date-helper"

// IST is UTC+5:30, no DST. A stored UTC instant must resolve to its IST calendar
// month — this is the exact "1 Jun admission billed as May" regression.
describe("appYearMonth", () => {
  it("reads the IST month, not the UTC one (the 1-Jun bug)", () => {
    // 1 Jun 2026 00:00 IST is stored as 31 May 18:30 UTC.
    expect(appYearMonth(new Date("2026-05-31T18:30:00.000Z"))).toEqual({
      year: 2026,
      month: 6,
    })
  })

  it("handles the year boundary in IST", () => {
    // 1 Jan 2026 00:00 IST == 31 Dec 2025 18:30 UTC.
    expect(appYearMonth(new Date("2025-12-31T18:30:00.000Z"))).toEqual({
      year: 2026,
      month: 1,
    })
  })

  it("midday UTC is unambiguous", () => {
    expect(appYearMonth(new Date("2026-06-15T12:00:00.000Z"))).toEqual({
      year: 2026,
      month: 6,
    })
  })
})

describe("appMonthStartUtc", () => {
  it("returns IST month-start as a UTC instant", () => {
    // IST Jul 2026 starts at 1 Jul 00:00 IST = 30 Jun 18:30 UTC.
    expect(appMonthStartUtc(2026, 7).toISOString()).toBe("2026-06-30T18:30:00.000Z")
  })

  it("normalizes out-of-range months past December", () => {
    // month 13 → Jan of next year.
    expect(appMonthStartUtc(2026, 13).toISOString()).toBe("2026-12-31T18:30:00.000Z")
  })

  it("normalizes month 0 to the previous December", () => {
    expect(appMonthStartUtc(2026, 0).toISOString()).toBe("2025-11-30T18:30:00.000Z")
  })
})

describe("shiftMonthStr", () => {
  it("rolls forward over a year boundary", () => {
    expect(shiftMonthStr("2026-12", 1)).toBe("2027-01")
  })
  it("rolls backward over a year boundary", () => {
    expect(shiftMonthStr("2026-01", -1)).toBe("2025-12")
  })
  it("is identity for delta 0", () => {
    expect(shiftMonthStr("2026-06", 0)).toBe("2026-06")
  })
})
