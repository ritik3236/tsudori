import { z } from "zod"

// Two related schemas:
//  • resetPasswordSchema — the API/domain contract (what the route accepts).
//  • resetPasswordFormSchema — the client form model, which adds a confirmation
//    field so the admin can't fat-finger the new password.

export const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(MAX_PASSWORD_LENGTH, "That password is too long."),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// ─── Client form model ────────────────────────────────────────────────────────

export const resetPasswordFormSchema = z
  .object({
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(MAX_PASSWORD_LENGTH, "That password is too long."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

// ─── Update / moderate member ───────────────────────────────────────────────

export const memberUpdateSchema = z.object({
  roleId: z.string().trim().min(1, "Pick a role."),
  reason: z.string().trim().max(200, "Keep the reason under 200 characters.").optional(),
})

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>

export const banMemberSchema = z.object({
  reason: z.string().trim().max(200, "Keep the reason under 200 characters.").optional(),
})

export type BanMemberInput = z.infer<typeof banMemberSchema>
