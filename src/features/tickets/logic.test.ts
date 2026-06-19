import { describe, expect, it } from "vitest"

import { isDoneStatus, nextResolvedAt } from "@/features/tickets/logic"

const NOW = new Date("2026-06-19T10:00:00.000Z")
const EARLIER = new Date("2026-06-01T08:00:00.000Z")

describe("isDoneStatus", () => {
  it("treats RESOLVED and CLOSED as done", () => {
    expect(isDoneStatus("RESOLVED")).toBe(true)
    expect(isDoneStatus("CLOSED")).toBe(true)
  })
  it("treats OPEN and IN_PROGRESS as not done", () => {
    expect(isDoneStatus("OPEN")).toBe(false)
    expect(isDoneStatus("IN_PROGRESS")).toBe(false)
  })
})

describe("nextResolvedAt", () => {
  it("stamps now when first becoming done", () => {
    expect(nextResolvedAt({ resolvedAt: null }, "RESOLVED", NOW)).toEqual(NOW)
    expect(nextResolvedAt({ resolvedAt: null }, "CLOSED", NOW)).toEqual(NOW)
  })

  it("keeps the original stamp when staying done (RESOLVED → CLOSED)", () => {
    expect(nextResolvedAt({ resolvedAt: EARLIER }, "CLOSED", NOW)).toEqual(EARLIER)
  })

  it("clears the stamp when reopened to an unfinished state", () => {
    expect(nextResolvedAt({ resolvedAt: EARLIER }, "OPEN", NOW)).toBeNull()
    expect(nextResolvedAt({ resolvedAt: EARLIER }, "IN_PROGRESS", NOW)).toBeNull()
  })

  it("stays null while unfinished and never resolved", () => {
    expect(nextResolvedAt({ resolvedAt: null }, "OPEN", NOW)).toBeNull()
  })
})
