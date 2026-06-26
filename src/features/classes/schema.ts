import { z } from "zod"

export const CLASS_STATUSES = ["ACTIVE", "INACTIVE"] as const

/**
 * Normalizes one identity part: case-folded and whitespace-stripped, so
 * "Class 2", "class 2" and "Class2" all collapse to "class2".
 */
function normalizePart(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "")
}

/**
 * The case- and space-insensitive uniqueness key for a class. The "|" separator
 * keeps name/section boundaries distinct ("ab"+"c" ≠ "a"+"bc"). This is the
 * single source of truth for the Class.nameKey column AND the duplicate
 * pre-check in the service — keeping them in lockstep. The SQL backfill in
 * prisma/migrations mirrors this exact expression.
 */
export function normalizeClassKey(name: string, section: string): string {
  return `${normalizePart(name)}|${normalizePart(section)}`
}

/** Tidies a display string: trims, then collapses internal whitespace runs to a
 *  single space — so "Class  6" is stored as "Class 6". */
function tidySpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, "Class name is required.").max(50).transform(tidySpaces),
  section: z
    .string({ message: "Section is required." })
    .trim()
    .min(1, "Section is required.")
    .max(10)
    .transform(tidySpaces),
  defaultMonthlyFee: z.coerce
    .number({ message: "Enter a valid amount." })
    .min(0, "Fee can't be negative.")
    .max(10_000_000),
  // The course this batch runs (drives fees via enrolments). Optional.
  courseId: z.string().trim().min(1).nullish(),
  status: z.enum(CLASS_STATUSES).default("ACTIVE"),
})

export const classUpdateSchema = classCreateSchema.partial().extend({
  // Per-class weekly-off override (Luxon weekdays); null = inherit the institute
  // default, [] = no weekly off. Omitted = leave unchanged.
  weeklyOffOverride: z.array(z.number().int().min(1).max(7)).max(7).nullable().optional(),
})

export type ClassCreateInput = z.infer<typeof classCreateSchema>
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>

// ─── Client form model ────────────────────────────────────────────────────────

// Sentinel for "no course" in the form select (Base UI selects dislike "").
export const NO_COURSE = "none"

export const classFormSchema = z.object({
  name: z.string().trim().min(1, "Class name is required.").max(50),
  section: z.string().trim().min(1, "Section is required.").max(10),
  defaultMonthlyFee: z
    .string()
    .min(1, "Monthly fee is required.")
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
      "Enter a valid amount."
    ),
  courseId: z.string(),
  status: z.enum(CLASS_STATUSES),
})

export type ClassFormValues = z.infer<typeof classFormSchema>

export function formValuesToInput(values: ClassFormValues): ClassCreateInput {
  return {
    name: values.name,
    section: values.section,
    defaultMonthlyFee: Number(values.defaultMonthlyFee),
    courseId: values.courseId && values.courseId !== NO_COURSE ? values.courseId : null,
    status: values.status,
  }
}
