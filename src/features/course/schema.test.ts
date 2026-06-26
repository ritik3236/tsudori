import { describe, expect, it } from "vitest"

import { normalizeCourseKey } from "@/features/course/schema"

describe("normalizeCourseKey", () => {
  it("folds case and strips all whitespace", () => {
    const canonical = normalizeCourseKey("NEET 2026")
    expect(normalizeCourseKey("neet 2026")).toBe(canonical)
    expect(normalizeCourseKey("  NEET   2026 ")).toBe(canonical)
    expect(normalizeCourseKey("neet2026")).toBe(canonical)
    expect(canonical).toBe("neet2026")
  })

  it("keeps different course names distinct", () => {
    expect(normalizeCourseKey("Class 10 A")).not.toBe(normalizeCourseKey("Class 10 B"))
  })
})
