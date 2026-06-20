import { z } from "zod"

// Priority levels, in ascending order of importance. Centralized so the schema,
// service ordering, and UI badges all read from one source.
export const NOTE_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const
export type NotePriorityValue = (typeof NOTE_PRIORITIES)[number]

export const PRIORITY_LABELS: Record<NotePriorityValue, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
}

// ─── API / domain contract ────────────────────────────────────────────────────

export const noteCreateSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(5000),
  priority: z.enum(NOTE_PRIORITIES).default("NORMAL"),
})

export const noteUpdateSchema = noteCreateSchema

// A reply on a note — body only; author/timestamps come from the server.
export const noteCommentCreateSchema = z.object({
  body: z.string().trim().min(1, "Write a reply first.").max(5000),
})

export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
export type NoteCommentCreateInput = z.infer<typeof noteCommentCreateSchema>
