import { z } from "zod"

// Logo is a downscaled base64 data URL (client-side resized before encoding).
// The cap is a safety net against an oversized payload reaching the DB.
const MAX_LOGO_CHARS = 1_000_000 // ~750 KB

const logoUrl = z
  .string()
  .trim()
  .max(MAX_LOGO_CHARS, "Logo image is too large.")
  .refine((v) => v === "" || v.startsWith("data:image/"), "Invalid image.")
  .nullish()
  .transform((v) => (v ? v : null))

const nullableText = (max: number) => z.string().trim().max(max).nullish()

// API / domain contract.
export const instituteUpdateSchema = z.object({
  name: z.string().trim().min(1, "Institute name is required.").max(120),
  logoUrl,
  email: z
    .union([z.string().trim().email("Enter a valid email."), z.literal("")])
    .nullish()
    .transform((v) => (v ? v : null)),
  phone: nullableText(20),
  addressLine: nullableText(200),
})

export type InstituteUpdateInput = z.infer<typeof instituteUpdateSchema>

// ─── Client form model (all strings) ─────────────────────────────────────────

export const instituteFormSchema = z.object({
  name: z.string().trim().min(1, "Institute name is required.").max(120),
  logoUrl: z.string().max(MAX_LOGO_CHARS, "Logo image is too large."),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]),
  phone: z.string().trim().max(20),
  addressLine: z.string().trim().max(200),
})

export type InstituteFormValues = z.infer<typeof instituteFormSchema>

export function formValuesToInput(values: InstituteFormValues): InstituteUpdateInput {
  return {
    name: values.name,
    logoUrl: values.logoUrl || null,
    email: values.email || null,
    phone: values.phone || null,
    addressLine: values.addressLine || null,
  }
}
