import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { NoteItem } from "@/features/notes/types"
import type {
  NoteCommentCreateInput,
  NoteCreateInput,
  NoteUpdateInput,
} from "@/features/notes/schema"

// The note board is shared across the institute: every member reads and posts the
// same feed. Edit/delete is limited to the author or an institute admin. Replies
// are open to every member. Every function is scoped by instituteId — the tenant
// boundary.

// Author name + the reply thread (oldest first) travel with every note so the
// board can render threads inline without a second round trip.
const NOTE_INCLUDE = {
  author: { select: { name: true } },
  comments: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  },
} satisfies Prisma.NoteInclude

type NoteWithRelations = Prisma.NoteGetPayload<{ include: typeof NOTE_INCLUDE }>

function toItem(n: NoteWithRelations, viewerId: string, isAdmin: boolean): NoteItem {
  return {
    id: n.id,
    body: n.body,
    priority: n.priority,
    authorId: n.authorId,
    authorName: n.author?.name ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    canEdit: isAdmin || n.authorId === viewerId,
    comments: n.comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorId: c.authorId,
      authorName: c.author?.name ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
  }
}

export async function listNotes(
  instituteId: string,
  viewerId: string,
  isAdmin: boolean
): Promise<NoteItem[]> {
  const rows = await prisma.note.findMany({
    where: { instituteId },
    // Highest priority floats to the top (enum order: LOW < NORMAL < HIGH), then
    // newest first within a priority.
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: NOTE_INCLUDE,
  })
  return rows.map((n) => toItem(n, viewerId, isAdmin))
}

export async function createNote(
  instituteId: string,
  authorId: string,
  input: NoteCreateInput
): Promise<NoteItem> {
  const note = await prisma.note.create({
    data: { instituteId, authorId, body: input.body, priority: input.priority },
    include: NOTE_INCLUDE,
  })
  return toItem(note, authorId, true)
}

export async function updateNote(
  instituteId: string,
  viewerId: string,
  isAdmin: boolean,
  id: string,
  input: NoteUpdateInput
): Promise<NoteItem> {
  const existing = await prisma.note.findFirst({ where: { id, instituteId } })
  if (!existing) throw new NotFoundError("Note not found.")
  if (!isAdmin && existing.authorId !== viewerId) throw new ForbiddenError()

  const note = await prisma.note.update({
    where: { id },
    data: { body: input.body, priority: input.priority },
    include: NOTE_INCLUDE,
  })
  return toItem(note, viewerId, isAdmin)
}

export async function deleteNote(
  instituteId: string,
  viewerId: string,
  isAdmin: boolean,
  id: string
): Promise<void> {
  const existing = await prisma.note.findFirst({ where: { id, instituteId } })
  if (!existing) throw new NotFoundError("Note not found.")
  if (!isAdmin && existing.authorId !== viewerId) throw new ForbiddenError()

  await prisma.note.delete({ where: { id } })
}

/**
 * Posts a reply on a note. Open to every institute member (the board is shared),
 * so the only gate is that the note belongs to the tenant. Returns the refreshed
 * note (with the new reply) so the client can seed its cache.
 */
export async function addNoteComment(
  instituteId: string,
  authorId: string,
  isAdmin: boolean,
  noteId: string,
  input: NoteCommentCreateInput
): Promise<NoteItem> {
  const note = await prisma.note.findFirst({
    where: { id: noteId, instituteId },
    select: { id: true },
  })
  if (!note) throw new NotFoundError("Note not found.")

  // Create the reply and read the parent note back (with the full refreshed
  // thread) in one call — the include resolves after the insert, so the new
  // reply is already in note.comments. Lets the client seed its cache without a
  // separate round trip.
  const comment = await prisma.noteComment.create({
    data: { noteId, authorId, body: input.body },
    include: { note: { include: NOTE_INCLUDE } },
  })
  return toItem(comment.note, authorId, isAdmin)
}
