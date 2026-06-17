import { z } from "zod"

// ─── API / domain contract ────────────────────────────────────────────────────

export const noteCreateSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(5000),
})

export const noteUpdateSchema = noteCreateSchema

export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>

// ─── Client form model ────────────────────────────────────────────────────────

export const noteFormSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(5000),
})

export type NoteFormValues = z.infer<typeof noteFormSchema>
