"use client"

import { useState } from "react"
import {
  Check,
  Copy,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Send,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { AVATAR_TINTS as AVATAR } from "@/lib/constants"
import { getInitials } from "@/lib/format"
import { formatRelative } from "@/lib/date-helper"
import {
  useAddNoteComment,
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "@/features/notes/hooks"
import {
  NOTE_PRIORITIES,
  PRIORITY_LABELS,
  type NotePriorityValue,
} from "@/features/notes/schema"
import type { NoteItem } from "@/features/notes/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/shared/empty-state"

/** Stable colour per author so the same person reads consistently down the feed. */
function avatarFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR[Math.abs(hash) % AVATAR.length]
}

/** Badge tint per priority. NORMAL is the default, so it carries no badge. */
const PRIORITY_BADGE: Record<NotePriorityValue, string | null> = {
  URGENT: "bg-rose-600 text-white dark:bg-rose-600 dark:text-white",
  HIGH: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  NORMAL: null,
  LOW: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
}

function PriorityBadge({ priority }: { priority: NotePriorityValue }) {
  const tint = PRIORITY_BADGE[priority]
  if (!tint) return null
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        tint
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

/** Compact priority picker shared by the composer and the edit form. */
function PrioritySelect({
  value,
  onChange,
  disabled,
}: {
  value: NotePriorityValue
  onChange: (v: NotePriorityValue) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as NotePriorityValue)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="w-32" aria-label="Priority">
        <SelectValue>
          {(v) => PRIORITY_LABELS[v as NotePriorityValue]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {NOTE_PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Priority shown as a coloured chip in the note header; for notes the viewer can
 * edit it's a dropdown that saves the new priority immediately (no edit mode).
 */
function InlinePriority({
  note,
  update,
}: {
  note: NoteItem
  update: ReturnType<typeof useUpdateNote>
}) {
  return (
    <Select
      value={note.priority}
      onValueChange={(v) => {
        if (v !== note.priority) {
          update.mutate({ body: note.body, priority: v as NotePriorityValue })
        }
      }}
      disabled={update.isPending}
    >
      <SelectTrigger
        aria-label="Change priority"
        className={cn(
          // Force chip dimensions over the trigger's button-sized data-size variants.
          "h-auto! w-auto gap-0.5 rounded! border-0! px-1.5! py-0.5! text-[10px]! font-medium tracking-wide uppercase shadow-none [&>svg]:size-2.5 [&>svg]:text-current [&>svg]:opacity-60",
          PRIORITY_BADGE[note.priority] ?? "bg-muted text-muted-foreground"
        )}
      >
        <SelectValue>{(v) => PRIORITY_LABELS[v as NotePriorityValue]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {NOTE_PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function NotesBoard() {
  const { data: notes, isLoading } = useNotes()
  const create = useCreateNote()
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState<NotePriorityValue>("NORMAL")

  const text = body.trim()
  const post = () => {
    if (!text) return
    create.mutate(
      { body: text, priority },
      {
        onSuccess: () => {
          setBody("")
          setPriority("NORMAL")
        },
      }
    )
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
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-muted-foreground hidden text-xs sm:inline">
            Shared with everyone in your institute
          </span>
          <div className="flex items-center gap-2">
            <PrioritySelect
              value={priority}
              onChange={setPriority}
              disabled={create.isPending}
            />
            <Button onClick={post} disabled={!text || create.isPending} size="sm">
              <MessageSquarePlus className="size-4" />
              {create.isPending ? "Posting…" : "Post note"}
            </Button>
          </div>
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
  const [showReplies, setShowReplies] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const [draftPriority, setDraftPriority] = useState<NotePriorityValue>(note.priority)
  const update = useUpdateNote(note.id)
  const remove = useDeleteNote()

  const name = note.authorName ?? "Unknown"
  const edited = note.updatedAt !== note.createdAt
  const replyCount = note.comments.length

  const save = () => {
    const next = draft.trim()
    if (!next) return
    update.mutate(
      { body: next, priority: draftPriority },
      { onSuccess: () => setEditing(false) }
    )
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
            {!editing &&
              (note.canEdit ? (
                <InlinePriority note={note} update={update} />
              ) : (
                <PriorityBadge priority={note.priority} />
              ))}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
              />
              <PrioritySelect
                value={draftPriority}
                onChange={setDraftPriority}
                disabled={update.isPending}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft(note.body)
                    setDraftPriority(note.priority)
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

      {!editing && (
        <div className="mt-2 flex items-center justify-between gap-1">
          <Button
            variant="ghost"
            size="xs"
            className={cn("text-muted-foreground", showReplies && "text-foreground")}
            onClick={() => setShowReplies((v) => !v)}
          >
            <MessageSquare className="size-3" />
            {replyCount > 0
              ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
              : "Reply"}
          </Button>
          <div className="flex items-center gap-1">
            {confirmDelete ? (
              <>
                <span className="text-muted-foreground mr-1 text-xs">
                  Delete this note?
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setConfirmDelete(false)}
                  disabled={remove.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => remove.mutate(note.id)}
                  disabled={remove.isPending}
                >
                  {remove.isPending ? "Deleting…" : "Delete"}
                </Button>
              </>
            ) : (
              <>
                <CopyNoteButton body={note.body} />
                {note.canEdit && (
                  <>
                    <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
                      <Pencil className="size-3" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="size-3" /> Delete
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!editing && showReplies && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {replyCount > 0 && (
            <div className="space-y-3">
              {note.comments.map((c) => (
                <CommentRow key={c.id} comment={c} />
              ))}
            </div>
          )}
          <ReplyComposer noteId={note.id} />
        </div>
      )}
    </div>
  )
}

/** A single reply — lighter than a note card (smaller avatar, tighter type). */
function CommentRow({ comment }: { comment: NoteItem["comments"][number] }) {
  const name = comment.authorName ?? "Unknown"
  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
          avatarFor(name)
        )}
      >
        {getInitials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-xs font-medium">{name}</span>
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {formatRelative(comment.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{comment.body}</p>
      </div>
    </div>
  )
}

/** Compact reply box. ⌘/Ctrl+Enter sends. */
function ReplyComposer({ noteId }: { noteId: string }) {
  const [text, setText] = useState("")
  const add = useAddNoteComment(noteId)
  const body = text.trim()

  const submit = () => {
    if (!body) return
    add.mutate({ body }, { onSuccess: () => setText("") })
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        placeholder="Write a reply…"
        className="min-h-9 resize-none py-1.5 text-sm"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit()
        }}
      />
      <Button
        size="sm"
        onClick={submit}
        disabled={!body || add.isPending}
        aria-label="Send reply"
      >
        <Send className="size-4" />
      </Button>
    </div>
  )
}

/** Copies a note's text to the clipboard, with a brief checkmark confirmation. */
function CopyNoteButton({ body }: { body: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body)
      } else {
        // Fallback for non-secure contexts where the async Clipboard API is absent.
        const ta = document.createElement("textarea")
        ta.value = body
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand("copy")
        document.body.removeChild(ta)
        if (!ok) throw new Error("copy command failed")
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy the note.")
    }
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      onClick={copy}
      aria-label="Copy note"
    >
      {copied ? (
        <>
          <Check className="size-3 text-emerald-600 dark:text-emerald-400" /> Copied
        </>
      ) : (
        <>
          <Copy className="size-3" /> Copy
        </>
      )}
    </Button>
  )
}
