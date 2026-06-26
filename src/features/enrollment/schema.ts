import { z } from "zod"

import { appDateToUtc } from "@/lib/date-helper"

export const ENROLLMENT_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"] as const

export const ENROLLMENT_STATUS_LABEL: Record<(typeof ENROLLMENT_STATUSES)[number], string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

// ─── API / domain contract ────────────────────────────────────────────────────

// A fixed override and a percent discount are mutually exclusive — at most one may
// be set. The UI enforces this via the fee-mode control; this guards direct API use.
function refineExclusiveFee(
  v: { feeOverride?: number | null; discountPercent?: number | null },
  ctx: z.RefinementCtx
) {
  if (v.feeOverride != null && v.discountPercent != null) {
    ctx.addIssue({
      code: "custom",
      path: ["discountPercent"],
      message: "Set a fixed fee or a discount percent, not both.",
    })
  }
}

export const enrollmentCreateSchema = z
  .object({
    studentId: z.string().min(1, "Student is required."),
    courseId: z.string().min(1, "Course is required."),
    startDate: z.coerce.date({ message: "Enter a valid start date." }),
    // A fixed monthly rate (scholarship/custom). Null → inherit the course fee.
    feeOverride: z.coerce
      .number({ message: "Enter a valid amount." })
      .min(0, "Fee can't be negative.")
      .max(10_000_000)
      .nullish(),
    // Percent off the course fee (0–100). Mutually exclusive with feeOverride.
    discountPercent: z.coerce
      .number({ message: "Enter a valid percent." })
      .min(0)
      .max(100)
      .nullish(),
    status: z.enum(ENROLLMENT_STATUSES).default("ACTIVE"),
  })
  .superRefine(refineExclusiveFee)

export const enrollmentUpdateSchema = z
  .object({
    feeOverride: z.coerce
      .number({ message: "Enter a valid amount." })
      .min(0, "Fee can't be negative.")
      .max(10_000_000)
      .nullish(),
    discountPercent: z.coerce
      .number({ message: "Enter a valid percent." })
      .min(0)
      .max(100)
      .nullish(),
    status: z.enum(ENROLLMENT_STATUSES).optional(),
  })
  .superRefine(refineExclusiveFee)

// A one-off charge added to an enrolment (admission/exam/materials/…).
export const oneTimeChargeSchema = z.object({
  label: z.string().trim().min(1, "A label is required.").max(80),
  amount: z.coerce
    .number({ message: "Enter a valid amount." })
    .positive("Enter an amount greater than zero.")
    .max(10_000_000),
  // Defaults to now in the service when omitted.
  dueDate: z.coerce.date().optional(),
})

export type EnrollmentCreateInput = z.infer<typeof enrollmentCreateSchema>
export type EnrollmentUpdateInput = z.infer<typeof enrollmentUpdateSchema>
export type OneTimeChargeInput = z.infer<typeof oneTimeChargeSchema>

// ─── Client form models (all strings) ─────────────────────────────────────────

// How the enrolment is priced: the full course fee, a fixed custom rate, or a
// percent off the course fee. One segmented control in the UI.
export const FEE_MODES = ["COURSE", "FIXED", "PERCENT"] as const
export type FeeMode = (typeof FEE_MODES)[number]

export const FEE_MODE_LABEL: Record<FeeMode, string> = {
  COURSE: "Course fee",
  FIXED: "Custom ₹",
  PERCENT: "% off",
}

const feeFields = {
  feeMode: z.enum(FEE_MODES),
  feeAmount: z.string(),
  discountPercent: z.string(),
}

type FeeFieldValues = { feeMode: FeeMode; feeAmount: string; discountPercent: string }

function refineFee(v: FeeFieldValues, ctx: z.RefinementCtx) {
  if (v.feeMode === "FIXED") {
    const n = Number(v.feeAmount)
    if (v.feeAmount === "" || Number.isNaN(n) || n < 0)
      ctx.addIssue({ code: "custom", path: ["feeAmount"], message: "Enter a valid amount." })
  }
  if (v.feeMode === "PERCENT") {
    const n = Number(v.discountPercent)
    if (v.discountPercent === "" || Number.isNaN(n) || n <= 0 || n > 100)
      ctx.addIssue({ code: "custom", path: ["discountPercent"], message: "Enter a percent 1–100." })
  }
}

function feeToInput(v: FeeFieldValues): { feeOverride: number | null; discountPercent: number | null } {
  return {
    feeOverride: v.feeMode === "FIXED" ? Number(v.feeAmount) : null,
    discountPercent: v.feeMode === "PERCENT" ? Number(v.discountPercent) : null,
  }
}

/** Derive the form's fee mode + values from a stored enrolment. */
export function feeModeOf(feeOverride: number | null, discountPercent: number | null): FeeFieldValues {
  if (discountPercent != null)
    return { feeMode: "PERCENT", feeAmount: "", discountPercent: String(discountPercent) }
  if (feeOverride != null)
    return { feeMode: "FIXED", feeAmount: String(feeOverride), discountPercent: "" }
  return { feeMode: "COURSE", feeAmount: "", discountPercent: "" }
}

export const enrollmentFormSchema = z
  .object({
    courseId: z.string().min(1, "Select a course."),
    startDate: z.string().min(1, "Start date is required."),
    ...feeFields,
  })
  .superRefine(refineFee)

export type EnrollmentFormValues = z.infer<typeof enrollmentFormSchema>

export function enrollmentValuesToInput(
  studentId: string,
  v: EnrollmentFormValues
): EnrollmentCreateInput {
  return {
    studentId,
    courseId: v.courseId,
    startDate: appDateToUtc(v.startDate),
    ...feeToInput(v),
    status: "ACTIVE",
  }
}

export const enrollmentEditFormSchema = z
  .object({ ...feeFields, status: z.enum(ENROLLMENT_STATUSES) })
  .superRefine(refineFee)

export type EnrollmentEditFormValues = z.infer<typeof enrollmentEditFormSchema>

export function enrollmentEditValuesToInput(v: EnrollmentEditFormValues): EnrollmentUpdateInput {
  return { ...feeToInput(v), status: v.status }
}

export const oneTimeFeeFormSchema = z.object({
  label: z.string().trim().min(1, "A label is required.").max(80),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Enter an amount greater than zero."),
})

export type OneTimeFeeFormValues = z.infer<typeof oneTimeFeeFormSchema>

export function oneTimeFeeValuesToInput(v: OneTimeFeeFormValues): OneTimeChargeInput {
  return { label: v.label, amount: Number(v.amount) }
}
