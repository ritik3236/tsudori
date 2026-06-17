import { z } from "zod"

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants"
import { appDateToUtc } from "@/lib/timezone"

// Two related schemas:
//  • studentCreateSchema / studentUpdateSchema — the API/domain contract. Optional
//    text fields are nullable so the edit form can *clear* a value (null) as
//    distinct from *not touching* it (undefined, only possible on PATCH).
//  • studentFormSchema — the client form model: all strings, so React Hook Form
//    typing stays simple. formValuesToInput() bridges form → domain.

export const STUDENT_STATUSES = ["ACTIVE", "INACTIVE"] as const

const nullableText = (max: number) => z.string().trim().max(max).nullish()

export const studentCreateSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  classId: z.string().trim().min(1).nullish(),
  rollNumber: nullableText(30),
  guardianName: nullableText(120),
  contactNumber: nullableText(20),
  email: z
    .union([z.string().trim().email("Enter a valid email."), z.literal("")])
    .nullish()
    .transform((v) => (v ? v : null)),
  admissionDate: z.coerce.date({ message: "Enter a valid admission date." }),
  monthlyFee: z.coerce
    .number({ message: "Enter a valid amount." })
    .min(0, "Fee can't be negative.")
    .max(10_000_000),
  status: z.enum(STUDENT_STATUSES).default("ACTIVE"),
  notes: nullableText(2000),
})

export const studentUpdateSchema = studentCreateSchema.partial()

export const studentQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  classId: z.string().trim().optional(),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type StudentCreateInput = z.infer<typeof studentCreateSchema>
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>
export type StudentQuery = z.infer<typeof studentQuerySchema>

// ─── Client form model ────────────────────────────────────────────────────────

export const NO_CLASS = "none"

export const studentFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  classId: z.string(),
  rollNumber: z.string().trim().max(30),
  guardianName: z.string().trim().max(120),
  contactNumber: z.string().trim().max(20),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]),
  admissionDate: z.string().min(1, "Admission date is required."),
  monthlyFee: z
    .string()
    .min(1, "Monthly fee is required.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid amount."),
  status: z.enum(STUDENT_STATUSES),
  notes: z.string().trim().max(2000),
})

export type StudentFormValues = z.infer<typeof studentFormSchema>

/** Maps the all-strings form model onto the nullable domain input. */
export function formValuesToInput(values: StudentFormValues): StudentCreateInput {
  return {
    fullName: values.fullName,
    classId: values.classId && values.classId !== NO_CLASS ? values.classId : null,
    rollNumber: values.rollNumber || null,
    guardianName: values.guardianName || null,
    contactNumber: values.contactNumber || null,
    email: values.email || null,
    admissionDate: appDateToUtc(values.admissionDate),
    monthlyFee: Number(values.monthlyFee),
    status: values.status,
    notes: values.notes || null,
  }
}
