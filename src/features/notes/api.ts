import { http } from "@/lib/http"
import type { NoteItem } from "@/features/notes/types"
import type {
  NoteCommentCreateInput,
  NoteCreateInput,
  NoteUpdateInput,
} from "@/features/notes/schema"

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
}

export const notesApi = {
  list: () => http.get<NoteItem[]>("/api/notes"),
  create: (data: NoteCreateInput) => http.post<NoteItem>("/api/notes", data),
  update: (id: string, data: NoteUpdateInput) =>
    http.patch<NoteItem>(`/api/notes/${id}`, data),
  remove: (id: string) => http.delete<void>(`/api/notes/${id}`),
  // Returns the refreshed note (with the new reply) so the cache can be seeded.
  addComment: (id: string, data: NoteCommentCreateInput) =>
    http.post<NoteItem>(`/api/notes/${id}/comments`, data),
}
