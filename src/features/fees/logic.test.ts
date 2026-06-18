import { describe, it, expect } from "vitest"

import { deriveMonth, planPayment, type Period } from "@/features/fees/logic"

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

describe("planPayment", () => {
  const base = {
    fee: 700,
    selected: { year: 2026, month: 6 } as Period,
    admission: { year: 2026, month: 6 } as Period,
    now: { year: 2026, month: 6 } as Period,
    amount: 0,
    waiveShortfall: false,
  }
  const plan = (over: Partial<Parameters<typeof planPayment>[0]>) =>
    planPayment({ paid: new Map(), waived: new Map(), ...base, ...over })

  it("settle-short: fills the month with cash and waives the remainder", () => {
    const p = plan({ amount: 600, waiveShortfall: true })
    expect(p.allocations).toEqual([{ year: 2026, month: 6, amount: 600 }])
    expect(p.waiveAmount).toBe(100)
  })

  it("does NOT waive when the cash fully covers the month", () => {
    const p = plan({ amount: 700, waiveShortfall: true })
    expect(p.allocations).toEqual([{ year: 2026, month: 6, amount: 700 }])
    expect(p.waiveAmount).toBe(0)
  })

  it("never over-waives an already-settled month", () => {
    const p = plan({
      paid: new Map([["2026-6", 700]]),
      amount: 100,
      waiveShortfall: true,
    })
    // Cash prepays July; June is already settled so nothing is waived.
    expect(p.allocations).toEqual([{ year: 2026, month: 7, amount: 100 }])
    expect(p.waiveAmount).toBe(0)
  })

  it("respects an existing partial waiver when settling short", () => {
    const p = plan({
      waived: new Map([["2026-6", 200]]),
      amount: 400,
      waiveShortfall: true,
    })
    // net due 500; pay 400; waive the remaining 100.
    expect(p.allocations).toEqual([{ year: 2026, month: 6, amount: 400 }])
    expect(p.waiveAmount).toBe(100)
  })

  it("clears the selected month first, then older months oldest-first", () => {
    const p = plan({
      fee: 5000,
      admission: { year: 2026, month: 1 },
      amount: 20000,
    })
    expect(p.allocations).toEqual([
      { year: 2026, month: 6, amount: 5000 }, // selected first
      { year: 2026, month: 1, amount: 5000 },
      { year: 2026, month: 2, amount: 5000 },
      { year: 2026, month: 3, amount: 5000 },
    ])
    expect(p.waiveAmount).toBe(0)
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
    expect(p.waiveAmount).toBe(0)
  })

  it("the sum of allocations equals the amount paid", () => {
    const p = plan({ fee: 5000, admission: { year: 2026, month: 1 }, amount: 17_500 })
    const total = p.allocations.reduce((s, a) => s + a.amount, 0)
    expect(total).toBe(17_500)
  })
})
