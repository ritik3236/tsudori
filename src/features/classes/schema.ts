import { z } from "zod"

export const CLASS_STATUSES = ["ACTIVE", "INACTIVE"] as const

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, "Class name is required.").max(50),
  section: z
    .string()
    .trim()
    .max(10)
    .nullish()
    .transform((v) => v || null),
  defaultMonthlyFee: z.coerce
    .number({ message: "Enter a valid amount." })
    .min(0, "Fee can't be negative.")
    .max(10_000_000),
  status: z.enum(CLASS_STATUSES).default("ACTIVE"),
})

export const classUpdateSchema = classCreateSchema.partial()

export type ClassCreateInput = z.infer<typeof classCreateSchema>
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>

// ─── Client form model ────────────────────────────────────────────────────────

export const classFormSchema = z.object({
  name: z.string().trim().min(1, "Class name is required.").max(50),
  section: z.string().trim().max(10),
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
    section: values.section || null,
    defaultMonthlyFee: Number(values.defaultMonthlyFee),
    status: values.status,
  }
}
