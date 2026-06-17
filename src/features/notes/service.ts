import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { NoteItem } from "@/features/notes/types"
import type { NoteCreateInput, NoteUpdateInput } from "@/features/notes/schema"

// The note board is shared across the institute: every member reads and posts the
// same feed. Edit/delete is limited to the author or an institute admin. Every
// function is scoped by instituteId — the tenant boundary.

type NoteWithAuthor = Prisma.NoteGetPayload<{
  include: { author: { select: { name: true } } }
}>

function toItem(n: NoteWithAuthor, viewerId: string, isAdmin: boolean): NoteItem {
  return {
    id: n.id,
    body: n.body,
    authorId: n.authorId,
    authorName: n.author?.name ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    canEdit: isAdmin || n.authorId === viewerId,
  }
}

export async function listNotes(
  instituteId: string,
  viewerId: string,
  isAdmin: boolean
): Promise<NoteItem[]> {
  const rows = await prisma.note.findMany({
    where: { instituteId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  })
  return rows.map((n) => toItem(n, viewerId, isAdmin))
}

export async function createNote(
  instituteId: string,
  authorId: string,
  input: NoteCreateInput
): Promise<NoteItem> {
  const note = await prisma.note.create({
    data: { instituteId, authorId, body: input.body },
    include: { author: { select: { name: true } } },
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
    data: { body: input.body },
    include: { author: { select: { name: true } } },
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
