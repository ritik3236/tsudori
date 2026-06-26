import { z } from "zod"

export const COURSE_STATUSES = ["ACTIVE", "INACTIVE"] as const

/**
 * Case- and space-insensitive uniqueness key for a course name: "NEET 2026",
 * "neet 2026" and "neet2026" all collapse to "neet2026". Single source of truth
 * for the Course.nameKey column AND the duplicate pre-check in the service. The
 * backfill in prisma/scripts/backfill-fee-ledger.ts mirrors this expression.
 */
export function normalizeCourseKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "")
}

// A one-time fee on the course (admission/exam/…), charged once per enrolment.
const componentSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  amount: z.coerce
    .number({ message: "Enter a valid amount." })
    .min(0, "Amount can't be negative.")
    .max(10_000_000),
})

export const courseCreateSchema = z.object({
  name: z.string().trim().min(1, "Course name is required.").max(80),
  durationMonths: z.coerce
    .number({ message: "Enter a whole number of months." })
    .int("Enter a whole number of months.")
    .min(1, "Duration must be at least 1 month.")
    .max(120),
  monthlyFee: z.coerce
    .number({ message: "Enter a valid amount." })
    .min(0, "Fee can't be negative.")
    .max(10_000_000),
  status: z.enum(COURSE_STATUSES).default("ACTIVE"),
  // A bundle packages other courses under this course's own combined fee.
  isBundle: z.boolean().default(false),
  memberCourseIds: z.array(z.string().min(1)).max(20).optional(),
  // Omitted = leave unchanged (update); on create, defaults to none.
  components: z.array(componentSchema).max(20).optional(),
})

export const courseUpdateSchema = courseCreateSchema.partial()

export type CourseCreateInput = z.infer<typeof courseCreateSchema>
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>

// ─── Client form model (all strings) ──────────────────────────────────────────

const componentFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid amount."),
})

export const courseFormSchema = z.object({
  name: z.string().trim().min(1, "Course name is required.").max(80),
  durationMonths: z
    .string()
    .min(1, "Duration is required.")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1,
      "Enter a whole number of months."
    ),
  monthlyFee: z
    .string()
    .min(1, "Monthly fee is required.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid amount."),
  status: z.enum(COURSE_STATUSES),
  isBundle: z.boolean(),
  memberCourseIds: z.array(z.string()),
  components: z.array(componentFormSchema),
})

export type CourseFormValues = z.infer<typeof courseFormSchema>

export function formValuesToInput(values: CourseFormValues): CourseCreateInput {
  return {
    name: values.name,
    durationMonths: Number(values.durationMonths),
    monthlyFee: Number(values.monthlyFee),
    status: values.status,
    isBundle: values.isBundle,
    memberCourseIds: values.isBundle ? values.memberCourseIds : [],
    components: values.components.map((c) => ({ name: c.name, amount: Number(c.amount) })),
  }
}
