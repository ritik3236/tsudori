import { z } from "zod"

import { STUDENT_STATUSES } from "@/features/students/schema"

// Creating an institute is MVP-minimal: just a name. Slug is generated; currency/
// locale/timezone use DB defaults; contact details are edited later in the
// institute's own settings, and members (incl. the first admin) are assigned from
// the institute's detail page.
export const instituteCreateSchema = z.object({
  name: z.string().trim().min(2, "Institute name is required.").max(120),
})

export type InstituteCreateInput = z.infer<typeof instituteCreateSchema>

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
