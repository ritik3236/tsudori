import { describe, it, expect } from "vitest"

import { splitEvenly, installmentStatus } from "@/features/installments/logic"
import { planInstallmentPayment } from "@/features/fees/logic"

describe("splitEvenly", () => {
  it("splits evenly and sums to the total", () => {
    const parts = splitEvenly(30000, 3)
    expect(parts).toEqual([10000, 10000, 10000])
  })

  it("spreads odd cents without going negative; sum stays exact", () => {
    const parts = splitEvenly(100, 3) // 33.34 + 33.33 + 33.33
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5)
    expect(Math.min(...parts)).toBeGreaterThanOrEqual(0)
  })

  it("handles n<=0 and a zero total", () => {
    expect(splitEvenly(100, 0)).toEqual([])
    expect(splitEvenly(0, 3)).toEqual([0, 0, 0])
  })
})

describe("installmentStatus", () => {
  const now = { nowYear: 2026, nowMonth: 6 }
  const at = (dueMonth: number, paid = 0, waived = 0, amount = 100) =>
    installmentStatus({ amount, paid, waived, dueYear: 2026, dueMonth, ...now })

  it("PAID when settled", () => expect(at(5, 100)).toBe("PAID"))
  it("OVERDUE when past + unpaid", () => expect(at(4)).toBe("OVERDUE"))
  it("DUE in the current month + unpaid", () => expect(at(6)).toBe("DUE"))
  it("UPCOMING when future + unpaid", () => expect(at(8)).toBe("UPCOMING"))
  it("PARTIAL when partly paid", () => expect(at(4, 40)).toBe("PARTIAL"))
})

describe("planInstallmentPayment", () => {
  const inst = (id: string, dueDate: string, outstanding: number) => ({
    id,
    label: null,
    dueDate,
    outstanding,
  })

  it("allocates oldest-first across installments", () => {
    const plan = planInstallmentPayment({
      installments: [inst("a", "2026-01-01", 1000), inst("b", "2026-02-01", 1000)],
      amount: 1500,
    })
    expect(plan.allocations).toEqual([
      { id: "a", label: null, dueDate: "2026-01-01", amount: 1000 },
      { id: "b", label: null, dueDate: "2026-02-01", amount: 500 },
    ])
    expect(plan.credit).toBe(0)
  })

  it("returns the leftover as credit once the schedule is covered", () => {
    const plan = planInstallmentPayment({
      installments: [inst("a", "2026-01-01", 1000)],
      amount: 1500,
    })
    expect(plan.allocations).toEqual([{ id: "a", label: null, dueDate: "2026-01-01", amount: 1000 }])
    expect(plan.credit).toBe(500)
  })

  it("skips fully-settled installments", () => {
    const plan = planInstallmentPayment({
      installments: [inst("a", "2026-01-01", 0), inst("b", "2026-02-01", 800)],
      amount: 500,
    })
    expect(plan.allocations).toEqual([{ id: "b", label: null, dueDate: "2026-02-01", amount: 500 }])
  })
})
