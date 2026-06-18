import { z } from "zod"

export const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

// ─── Create invite (admin side) ───────────────────────────────────────────────
export const inviteCreateSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  roleId: z.string().min(1, "Role is required."),
})
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>

export const inviteCreateFormSchema = inviteCreateSchema
export type InviteCreateFormValues = z.infer<typeof inviteCreateFormSchema>

// ─── Accept invite (invitee side) ─────────────────────────────────────────────
// The API contract — token comes from the URL, name + password from the form.
export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1, "Name is required.").max(120),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(MAX_PASSWORD_LENGTH, "That password is too long."),
})
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>

// Client form model (adds confirm-password).
export const acceptInviteFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(MAX_PASSWORD_LENGTH, "That password is too long."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })
export type AcceptInviteFormValues = z.infer<typeof acceptInviteFormSchema>
