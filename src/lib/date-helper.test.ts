import { describe, it, expect } from "vitest"

import {
  appYearMonth,
  appMonthStartUtc,
  shiftMonthStr,
  appDateToUtc,
  utcToAppDateStr,
  appDayBounds,
  appMonthBounds,
  toDateInputValue,
} from "@/lib/date-helper"

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

describe("appDateToUtc / utcToAppDateStr", () => {
  it("parses an IST calendar day to its UTC instant", () => {
    // 17 Jun 2026 00:00 IST == 16 Jun 2026 18:30 UTC.
    expect(appDateToUtc("2026-06-17").toISOString()).toBe("2026-06-16T18:30:00.000Z")
  })

  it("formats a UTC instant back to its IST calendar day", () => {
    expect(utcToAppDateStr(new Date("2026-06-16T18:30:00.000Z"))).toBe("2026-06-17")
  })

  it("an instant just before IST midnight still reads as the previous day", () => {
    // 16 Jun 18:29 UTC == 16 Jun 23:59 IST → still the 16th.
    expect(utcToAppDateStr(new Date("2026-06-16T18:29:00.000Z"))).toBe("2026-06-16")
  })

  it("round-trips a date string IST -> UTC -> IST", () => {
    for (const d of ["2026-01-01", "2026-06-17", "2026-12-31"]) {
      expect(utcToAppDateStr(appDateToUtc(d))).toBe(d)
    }
  })
})

describe("appDayBounds", () => {
  it("returns [IST midnight, next IST midnight) as UTC instants", () => {
    const [start, end] = appDayBounds("2026-06-17")
    expect(start.toISOString()).toBe("2026-06-16T18:30:00.000Z")
    expect(end.toISOString()).toBe("2026-06-17T18:30:00.000Z")
  })
})

describe("appMonthBounds", () => {
  it("returns [IST month start, next IST month start) as UTC instants", () => {
    const [start, end] = appMonthBounds("2026-06")
    expect(start.toISOString()).toBe("2026-05-31T18:30:00.000Z")
    expect(end.toISOString()).toBe("2026-06-30T18:30:00.000Z")
  })
})

describe("toDateInputValue", () => {
  it("formats a UTC instant to its IST yyyy-MM-dd", () => {
    expect(toDateInputValue(new Date("2026-05-31T18:30:00.000Z"))).toBe("2026-06-01")
  })
  it("returns empty string for null/invalid", () => {
    expect(toDateInputValue(null)).toBe("")
    expect(toDateInputValue("not-a-date")).toBe("")
  })
})
