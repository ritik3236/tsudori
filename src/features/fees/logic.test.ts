import { describe, it, expect } from "vitest"

import {
  deriveMonth,
  effectiveFee,
  planPayment,
  resolveReversal,
  type Period,
} from "@/features/fees/logic"

describe("effectiveFee", () => {
  it("uses the course rate when there's no override", () => {
    expect(effectiveFee(1800, null)).toBe(1800)
  })
  it("uses the override when set (incl. a scholarship to zero)", () => {
    expect(effectiveFee(1800, 1000)).toBe(1000)
    expect(effectiveFee(1800, 0)).toBe(0)
  })
  it("applies a percentage discount that tracks the course rate", () => {
    expect(effectiveFee(2000, null, 25)).toBe(1500)
    expect(effectiveFee(2200, null, 25)).toBe(1650) // same % → higher fee tracks
  })
  it("percentage wins over a (stale) override and rounds to 2dp", () => {
    expect(effectiveFee(1000, 999, 50)).toBe(500)
    expect(effectiveFee(1000, null, 33.33)).toBe(666.7)
  })
})

describe("deriveMonth", () => {
  it("UNPAID when nothing paid or waived", () => {
    expect(deriveMonth(700, 0, 0)).toMatchObject({ pending: 700, advance: 0, status: "UNPAID" })
  })
  it("PAID when fully covered by cash", () => {
    expect(deriveMonth(700, 700, 0)).toMatchObject({ pending: 0, status: "PAID" })
  })
  it("PARTIAL when some cash but still owed", () => {
    expect(deriveMonth(700, 600, 0)).toMatchObject({ pending: 100, status: "PARTIAL" })
  })
  it("ADVANCE when overpaid", () => {
    expect(deriveMonth(700, 800, 0)).toMatchObject({ advance: 100, status: "ADVANCE" })
  })
  it("WAIVED when settled by waiver alone (no cash)", () => {
    expect(deriveMonth(700, 0, 700)).toMatchObject({ pending: 0, status: "WAIVED" })
  })
  it("UNPAID when a partial waiver still leaves a balance", () => {
    expect(deriveMonth(700, 0, 300)).toMatchObject({ netDue: 400, pending: 400, status: "UNPAID" })
  })
  it("PAID when cash + waiver exactly settle the net due", () => {
    expect(deriveMonth(700, 400, 300)).toMatchObject({ netDue: 400, pending: 0, status: "PAID" })
  })
})

describe("resolveReversal", () => {
  it("reverses the full amount when none requested", () => {
    expect(resolveReversal(700, 0)).toEqual({ ok: true, amount: 700 })
  })
  it("reverses the remaining amount after a prior partial reversal", () => {
    expect(resolveReversal(700, 200)).toEqual({ ok: true, amount: 500 })
  })
  it("accepts a valid partial amount", () => {
    expect(resolveReversal(700, 0, 300)).toEqual({ ok: true, amount: 300 })
  })
  it("rejects when already fully reversed", () => {
    expect(resolveReversal(700, 700)).toEqual({
      ok: false,
      reason: "ALREADY_REVERSED",
    })
  })
  it("rejects a non-positive requested amount", () => {
    expect(resolveReversal(700, 0, 0)).toEqual({
      ok: false,
      reason: "INVALID_AMOUNT",
    })
  })
  it("rejects more than the remaining amount", () => {
    expect(resolveReversal(700, 200, 600)).toEqual({
      ok: false,
      reason: "EXCEEDS_REMAINING",
    })
  })
  it("clamps a request equal to remaining within sub-cent tolerance", () => {
    expect(resolveReversal(700, 0, 700.001)).toEqual({ ok: true, amount: 700 })
  })
})

describe("planPayment", () => {
  const base = {
    fee: 700,
    selected: { year: 2026, month: 6 } as Period,
    admission: { year: 2026, month: 6 } as Period,
    now: { year: 2026, month: 6 } as Period,
    amount: 0,
    waiveRemaining: false,
  }
  const plan = (over: Partial<Parameters<typeof planPayment>[0]>) =>
    planPayment({ paid: new Map(), waived: new Map(), ...base, ...over })

  it("pay-and-clear: fills the month with cash and waives the remainder", () => {
    const p = plan({ amount: 600, waiveRemaining: true })
    expect(p.allocations).toEqual([{ year: 2026, month: 6, amount: 600 }])
    expect(p.waiveAllocations).toEqual([{ year: 2026, month: 6, amount: 100 }])
  })

  it("does NOT waive when the cash fully covers the month", () => {
    const p = plan({ amount: 700, waiveRemaining: true })
    expect(p.allocations).toEqual([{ year: 2026, month: 6, amount: 700 }])
    expect(p.waiveAllocations).toEqual([])
  })

  it("never over-waives an already-settled month", () => {
    const p = plan({
      paid: new Map([["2026-6", 700]]),
      amount: 100,
      waiveRemaining: true,
    })
    // Cash prepays July; June is already settled so nothing is waived.
    expect(p.allocations).toEqual([{ year: 2026, month: 7, amount: 100 }])
    expect(p.waiveAllocations).toEqual([])
  })

  it("respects an existing partial waiver when clearing remaining", () => {
    const p = plan({
      waived: new Map([["2026-6", 200]]),
      amount: 400,
      waiveRemaining: true,
    })
    // net due 500; pay 400; waive the remaining 100.
    expect(p.allocations).toEqual([{ year: 2026, month: 6, amount: 400 }])
    expect(p.waiveAllocations).toEqual([{ year: 2026, month: 6, amount: 100 }])
  })

  it("a normal payment backfills the oldest unpaid month first", () => {
    const p = plan({
      fee: 5000,
      admission: { year: 2026, month: 1 },
      amount: 20000,
    })
    expect(p.allocations).toEqual([
      { year: 2026, month: 1, amount: 5000 }, // oldest first
      { year: 2026, month: 2, amount: 5000 },
      { year: 2026, month: 3, amount: 5000 },
      { year: 2026, month: 4, amount: 5000 },
    ])
    expect(p.waiveAllocations).toEqual([])
  })

  it("pay-and-clear: cash lands oldest-first, then every owed month is waived", () => {
    const p = plan({
      fee: 5000,
      admission: { year: 2026, month: 4 }, // Apr, May, Jun owed = 15000
      amount: 6000,
      waiveRemaining: true,
    })
    // 6000 backfills Apr (5000) then May (1000); the rest is waived.
    expect(p.allocations).toEqual([
      { year: 2026, month: 4, amount: 5000 },
      { year: 2026, month: 5, amount: 1000 },
    ])
    expect(p.waiveAllocations).toEqual([
      { year: 2026, month: 5, amount: 4000 },
      { year: 2026, month: 6, amount: 5000 },
    ])
    const settled =
      p.allocations.reduce((s, a) => s + a.amount, 0) +
      p.waiveAllocations.reduce((s, a) => s + a.amount, 0)
    expect(settled).toBe(15000) // total outstanding fully settled
  })

  it("prepays upcoming months once everything owed is cleared", () => {
    const p = plan({
      fee: 1000,
      paid: new Map([["2026-6", 1000]]), // June already paid
      amount: 3000,
    })
    expect(p.allocations).toEqual([
      { year: 2026, month: 7, amount: 1000 },
      { year: 2026, month: 8, amount: 1000 },
      { year: 2026, month: 9, amount: 1000 },
    ])
  })

  it("safety net: a zero fee keeps the money on the selected month", () => {
    const p = plan({ fee: 0, amount: 500 })
    expect(p.allocations).toEqual([{ year: 2026, month: 6, amount: 500 }])
    expect(p.waiveAllocations).toEqual([])
  })

  it("the sum of allocations equals the amount paid", () => {
    const p = plan({ fee: 5000, admission: { year: 2026, month: 1 }, amount: 17_500 })
    const total = p.allocations.reduce((s, a) => s + a.amount, 0)
    expect(total).toBe(17_500)
  })
})
