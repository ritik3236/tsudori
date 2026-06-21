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

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, "Class name is required.").max(50),
  section: z
    .string({ message: "Section is required." })
    .trim()
    .min(1, "Section is required.")
    .max(10),
  defaultMonthlyFee: z.coerce
    .number({ message: "Enter a valid amount." })
    .min(0, "Fee can't be negative.")
    .max(10_000_000),
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
  status: z.enum(CLASS_STATUSES),
})

export type ClassFormValues = z.infer<typeof classFormSchema>

export function formValuesToInput(values: ClassFormValues): ClassCreateInput {
  return {
    name: values.name,
    section: values.section,
    defaultMonthlyFee: Number(values.defaultMonthlyFee),
    status: values.status,
  }
}
