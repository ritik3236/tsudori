// Wire DTO for a shared note. Dates normalised to ISO strings.

import type { NotePriorityValue } from "@/features/notes/schema"

export type NoteItem = {
  id: string
  body: string
  priority: NotePriorityValue
  authorId: string | null
  authorName: string | null
  createdAt: string
  updatedAt: string
  /** Whether the current viewer may edit/delete this note (author or admin). */
  canEdit: boolean
}
