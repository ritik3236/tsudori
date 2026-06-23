import { z } from "zod"

import { STUDENT_STATUSES } from "@/features/students/schema"
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/features/members/schema"

// Creating an institute also provisions its first admin in the same step: the
// Institute row (slug generated; currency/locale/timezone use DB defaults) plus
// a real Neon Auth login for the admin, linked as an Institute Admin member.
// Contact details are edited later in the institute's own settings. The admin
// fields are required — a new tenant ships usable, never empty.
export const instituteCreateSchema = z.object({
  name: z.string().trim().min(2, "Institute name is required.").max(120),
  adminName: z.string().trim().min(1, "Admin name is required.").max(120),
  adminEmail: z.string().trim().toLowerCase().email("Enter a valid email."),
  adminPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(MAX_PASSWORD_LENGTH, "That password is too long."),
})

export type InstituteCreateInput = z.infer<typeof instituteCreateSchema>

// Client form model — adds a confirmation field so the admin's password can't be
// fat-fingered (mirrors the add-member form).
export const instituteCreateFormSchema = z
  .object({
    name: z.string().trim().min(2, "Institute name is required.").max(120),
    adminName: z.string().trim().min(1, "Admin name is required.").max(120),
    adminEmail: z.string().trim().email("Enter a valid email."),
    adminPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(MAX_PASSWORD_LENGTH, "That password is too long."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.adminPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

export type InstituteCreateFormValues = z.infer<typeof instituteCreateFormSchema>

// Cross-tenant student list (platform). Mirrors studentQuerySchema minus classId
// (classes are per-institute) — the platform list spans every institute.
export const platformStudentQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  archived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PlatformStudentQuery = z.infer<typeof platformStudentQuerySchema>
