import { describe, expect, it } from "vitest"

import {
  DEFAULT_WEEKLY_OFF,
  effectiveWeeklyOff,
  parseWeeklyOff,
  resolveWorkingDay,
} from "@/lib/working-day"

// Luxon weekdays: Mon=1 … Sun=7. Default weekly-off is [7] (Sunday).
const SUN = 7
const MON = 1

describe("resolveWorkingDay precedence", () => {
  it("a normal weekday with the default weekly-off is open", () => {
    expect(resolveWorkingDay({ weekday: MON, weeklyOff: DEFAULT_WEEKLY_OFF })).toEqual({
      working: true,
      reason: "open",
      name: null,
    })
  })

  it("weekly-off day (Sunday) is closed", () => {
    const r = resolveWorkingDay({ weekday: SUN, weeklyOff: [SUN] })
    expect(r.working).toBe(false)
    expect(r.reason).toBe("weekly-off")
  })

  it("a normal weekday is a working day", () => {
    const r = resolveWorkingDay({ weekday: MON, weeklyOff: [SUN] })
    expect(r.working).toBe(true)
    expect(r.reason).toBe("open")
  })

  it("a named OFF holiday closes a normal working day", () => {
    const r = resolveWorkingDay({
      weekday: MON,
      weeklyOff: [SUN],
      instituteRuling: { kind: "OFF", name: "Diwali" },
    })
    expect(r).toEqual({ working: false, reason: "holiday", name: "Diwali" })
  })

  it("a WORKING override opens a weekly-off day (extra class on Sunday)", () => {
    const r = resolveWorkingDay({
      weekday: SUN,
      weeklyOff: [SUN],
      instituteRuling: { kind: "WORKING", name: null },
    })
    expect(r.working).toBe(true)
    expect(r.reason).toBe("extra-class")
  })

  it("a class-specific ruling wins over the institute-wide one", () => {
    const r = resolveWorkingDay({
      weekday: MON,
      weeklyOff: [SUN],
      instituteRuling: { kind: "OFF", name: "Institute closed" },
      classRuling: { kind: "WORKING", name: null },
    })
    expect(r.working).toBe(true)
    expect(r.reason).toBe("extra-class")
  })
})

describe("effectiveWeeklyOff", () => {
  it("uses the class override when set (incl. explicit empty)", () => {
    expect(effectiveWeeklyOff([SUN], [])).toEqual([])
    expect(effectiveWeeklyOff([SUN], [6, 7])).toEqual([6, 7])
  })
  it("falls back to the institute default when the class inherits (null)", () => {
    expect(effectiveWeeklyOff([SUN], null)).toEqual([SUN])
  })
})

describe("parseWeeklyOff", () => {
  it("cleans, dedupes and sorts valid weekdays", () => {
    expect(parseWeeklyOff([7, 7, 1])).toEqual([1, 7])
    expect(parseWeeklyOff(["6", 8, 0, 3])).toEqual([3, 6]) // drops out-of-range 8/0
  })
  it("preserves an explicit empty array (no weekly off)", () => {
    expect(parseWeeklyOff([])).toEqual([])
  })
  it("returns null for absent/malformed values (→ inherit / default)", () => {
    expect(parseWeeklyOff(null)).toBeNull()
    expect(parseWeeklyOff(undefined)).toBeNull()
    expect(parseWeeklyOff("nope")).toBeNull()
  })
})
