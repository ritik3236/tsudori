import { z } from "zod"

import { STUDENT_STATUSES } from "@/features/students/schema"
import { MIN_PASSWORD_LENGTH } from "@/features/members/schema"

// Creating an institute is MVP-minimal: just a name. Slug is generated; currency/
// locale/timezone use DB defaults; contact details are edited later in the
// institute's own settings, and members (incl. the first admin) are assigned from
// the institute's detail page.
export const instituteCreateSchema = z.object({
  name: z.string().trim().min(2, "Institute name is required.").max(120),
})

export type InstituteCreateInput = z.infer<typeof instituteCreateSchema>

// Platform "add member" — email is the identity. For an EXISTING login only the
// email + role matter (we just attach a membership, so one person can belong to
// several institutes with one login). For a NEW person, name + password are
// required too — enforced server-side, and surfaced in the dialog, which only
// shows those fields once the email is found to be new.
export const instituteMemberAddSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  roleId: z.string().trim().min(1, "Pick a role."),
  name: z.string().trim().max(120).optional(),
  password: z.string().optional(),
})

export type InstituteMemberAddInput = z.infer<typeof instituteMemberAddSchema>

// Client form model for that dialog. `existing` is set from the email lookup;
// when true we're attaching an existing login, so name/password are unused and
// skipped by the refine. When false (new person) they're required + must match.
export const instituteMemberAddFormSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email."),
    roleId: z.string().min(1, "Pick a role."),
    name: z.string().trim(),
    password: z.string(),
    confirmPassword: z.string(),
    existing: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.existing) return // attaching an existing login — name/password unused
    if (v.name.trim().length < 1) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "Name is required." })
    }
    if (v.password.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      })
    } else if (v.password !== v.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords don't match.",
      })
    }
  })

export type InstituteMemberAddFormValues = z.infer<typeof instituteMemberAddFormSchema>

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
