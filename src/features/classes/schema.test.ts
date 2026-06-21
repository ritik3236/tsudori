import { describe, expect, it } from "vitest"

import { normalizeClassKey } from "@/features/classes/schema"

describe("normalizeClassKey", () => {
  it("folds case and strips all whitespace", () => {
    const canonical = normalizeClassKey("Class 2", "B")
    expect(normalizeClassKey("class 2", "b")).toBe(canonical)
    expect(normalizeClassKey("  CLASS   2 ", " B ")).toBe(canonical)
    expect(normalizeClassKey("Class2", "B")).toBe(canonical)
    expect(canonical).toBe("class2|b")
  })

  it("keeps different sections distinct", () => {
    expect(normalizeClassKey("Class 2", "A")).not.toBe(normalizeClassKey("Class 2", "B"))
  })

  it("keeps different names distinct", () => {
    expect(normalizeClassKey("Class 2", "A")).not.toBe(normalizeClassKey("Class 10", "A"))
  })

  it("does not let the name/section boundary blur (separator)", () => {
    // Without the separator, "ab"+"c" and "a"+"bc" would both be "abc".
    expect(normalizeClassKey("ab", "c")).not.toBe(normalizeClassKey("a", "bc"))
  })
})
