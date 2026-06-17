"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { noteKeys, notesApi } from "@/features/notes/api"
import type { NoteCreateInput, NoteUpdateInput } from "@/features/notes/schema"

export { noteKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

export function useNotes() {
  return useQuery({
    queryKey: noteKeys.lists(),
    queryFn: () => notesApi.list(),
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NoteCreateInput) => notesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all })
      toast.success("Note posted.")
    },
    onError: (e) => reportError(e, "Couldn't post the note."),
  })
}

export function useUpdateNote(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NoteUpdateInput) => notesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all })
      toast.success("Note updated.")
    },
    onError: (e) => reportError(e, "Couldn't update the note."),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all })
      toast.success("Note deleted.")
    },
    onError: (e) => reportError(e, "Couldn't delete the note."),
  })
}
