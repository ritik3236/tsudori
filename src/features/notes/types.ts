// Wire DTO for a shared note. Dates normalised to ISO strings.

export type NoteItem = {
  id: string
  body: string
  authorId: string | null
  authorName: string | null
  createdAt: string
  updatedAt: string
  /** Whether the current viewer may edit/delete this note (author or admin). */
  canEdit: boolean
}
