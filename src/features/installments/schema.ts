import { z } from "zod"

import { appDateToUtc } from "@/lib/date-helper"

// A due date arrives from the picker as "YYYY-MM-DD" and is stored IST→UTC (the
// app convention), so it buckets into the right month via appYearMonth.
const dueDate = z
  .string()
  .min(1, "Due date is required.")
  .refine((s) => !Number.isNaN(appDateToUtc(s).getTime()), "Enter a valid due date.")
  .transform((s) => appDateToUtc(s))

// One row of a student's installment schedule. `id` is present for rows that
// already exist (kept/edited); absent for new rows.
export const installmentRowSchema = z.object({
  id: z.string().min(1).optional(),
  dueDate,
  amount: z.coerce
    .number({ message: "Enter a valid amount." })
    .min(0, "Amount can't be negative.")
    .max(10_000_000),
  label: z.string().trim().max(80).nullish(),
})

export const savePlanSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  rows: z.array(installmentRowSchema).min(1, "Add at least one installment."),
})

export const switchMonthlySchema = z.object({
  studentId: z.string().min(1, "Student is required."),
})

export type SavePlanInput = z.infer<typeof savePlanSchema>
export type InstallmentRowInput = z.infer<typeof installmentRowSchema>
