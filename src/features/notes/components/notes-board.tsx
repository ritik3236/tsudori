"use client"

import { useState } from "react"
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { AVATAR_TINTS as AVATAR } from "@/lib/constants"
import { getInitials } from "@/lib/format"
import { formatRelative } from "@/lib/date-helper"
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from "@/features/notes/hooks"
import type { NoteItem } from "@/features/notes/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"

/** Stable colour per author so the same person reads consistently down the feed. */
function avatarFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR[Math.abs(hash) % AVATAR.length]
}

export function NotesBoard() {
  const { data: notes, isLoading } = useNotes()
  const create = useCreateNote()
  const [body, setBody] = useState("")

  const text = body.trim()
  const post = () => {
    if (!text) return
    create.mutate({ body: text }, { onSuccess: () => setBody("") })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Composer */}
      <div className="bg-card rounded-2xl border p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Ask a question, flag a bug, or leave a note for the team…"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post()
          }}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Shared with everyone in your institute
          </span>
          <Button onClick={post} disabled={!text || create.isPending} size="sm">
            <MessageSquarePlus className="size-4" />
            {create.isPending ? "Posting…" : "Post note"}
          </Button>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !notes || notes.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="No notes yet"
          description="Start the conversation — your first note will show up here."
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteCard({ note }: { note: NoteItem }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const update = useUpdateNote(note.id)
  const remove = useDeleteNote()

  const name = note.authorName ?? "Unknown"
  const edited = note.updatedAt !== note.createdAt

  const save = () => {
    const next = draft.trim()
    if (!next) return
    update.mutate({ body: next }, { onSuccess: () => setEditing(false) })
  }

  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            avatarFor(name)
          )}
        >
          {getInitials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatRelative(note.createdAt)}
              {edited ? " · edited" : ""}
            </span>
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft(note.body)
                    setEditing(false)
                  }}
                  disabled={update.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={!draft.trim() || update.isPending}
                >
                  {update.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm whitespace-pre-wrap break-words">{note.body}</p>
          )}
        </div>
      </div>

      {note.canEdit && !editing && (
        <div className="mt-2 flex items-center justify-end gap-1">
          {confirmDelete ? (
            <>
              <span className="text-muted-foreground mr-1 text-xs">Delete this note?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={remove.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => remove.mutate(note.id)}
                disabled={remove.isPending}
              >
                {remove.isPending ? "Deleting…" : "Delete"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
