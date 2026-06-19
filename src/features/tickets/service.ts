import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { nextResolvedAt } from "@/features/tickets/logic"
import { TICKET_PAGE_SIZE } from "@/features/tickets/schema"
import type {
  CommentCreateInput,
  TicketCreateInput,
  TicketQuery,
  TicketTriageInput,
} from "@/features/tickets/schema"
import type { TicketDetail, TicketListItem, TicketPage } from "@/features/tickets/types"

// Tickets are a product-support desk. Any institute member files one and sees
// their own; an institute admin sees all of their institute's; the platform
// super admin sees every institute's and is the handler (triage + staff replies).

/** Everything the service needs to know about who is acting on a ticket. */
export type TicketViewer = {
  viewerId: string
  instituteId: string
  isInstituteAdmin: boolean
  isSuperAdmin: boolean
}

const LIST_INCLUDE = {
  institute: { select: { name: true } },
  requester: { select: { name: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude

const DETAIL_INCLUDE = {
  institute: { select: { name: true } },
  requester: { select: { name: true } },
  comments: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  },
} satisfies Prisma.TicketInclude

type TicketForList = Prisma.TicketGetPayload<{ include: typeof LIST_INCLUDE }>
type TicketForDetail = Prisma.TicketGetPayload<{ include: typeof DETAIL_INCLUDE }>

function toListItem(t: TicketForList): TicketListItem {
  return {
    id: t.id,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    requesterName: t.requester?.name ?? null,
    instituteId: t.instituteId,
    instituteName: t.institute?.name ?? null,
    commentCount: t._count.comments,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

// Builds an infinite-scroll page. Queries fetch PAGE_SIZE + 1 rows so the extra
// row signals "there's more" without a second round trip; `total` comes from a
// parallel count so the UI can show an accurate tally.
function toPage(rows: TicketForList[], offset: number, total: number): TicketPage {
  const items = rows.slice(0, TICKET_PAGE_SIZE).map(toListItem)
  const nextOffset = rows.length > TICKET_PAGE_SIZE ? offset + TICKET_PAGE_SIZE : null
  return { items, nextOffset, total }
}

function toDetail(
  t: TicketForDetail,
  flags: { canManage: boolean; isRequester: boolean }
): TicketDetail {
  return {
    id: t.id,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    requesterId: t.requesterId,
    requesterName: t.requester?.name ?? null,
    instituteId: t.instituteId,
    instituteName: t.institute?.name ?? null,
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    comments: t.comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.author?.name ?? null,
      authorIsStaff: c.authorIsStaff,
      createdAt: c.createdAt.toISOString(),
    })),
    canManage: flags.canManage,
    isRequester: flags.isRequester,
  }
}

/** Can this viewer see this ticket? Super admin (any), requester, or in-institute admin. */
function authorize(
  t: { requesterId: string | null; instituteId: string },
  v: TicketViewer
): { isRequester: boolean } {
  const isRequester = t.requesterId != null && t.requesterId === v.viewerId
  const allowed =
    v.isSuperAdmin ||
    isRequester ||
    (v.isInstituteAdmin && t.instituteId === v.instituteId)
  if (!allowed) throw new ForbiddenError()
  return { isRequester }
}

/** Loads a ticket detail with the same authorization gate as the read path. */
async function loadDetail(id: string, v: TicketViewer): Promise<TicketDetail> {
  const t = await prisma.ticket.findUnique({ where: { id }, include: DETAIL_INCLUDE })
  if (!t) throw new NotFoundError("Ticket not found.")
  const { isRequester } = authorize(t, v)
  return toDetail(t, { canManage: v.isSuperAdmin, isRequester })
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** The requester's own tickets (institute admins see all of their institute's). */
export async function listMyTickets(
  instituteId: string,
  viewerId: string,
  isInstituteAdmin: boolean,
  offset = 0
): Promise<TicketPage> {
  const where: Prisma.TicketWhereInput = isInstituteAdmin
    ? { instituteId }
    : { instituteId, requesterId: viewerId }
  const [rows, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      // Unfinished first (enum order OPEN < … < CLOSED), newest within a status.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: LIST_INCLUDE,
      skip: offset,
      take: TICKET_PAGE_SIZE + 1,
    }),
    // Only count on the first page — the UI reads total from page 0, so counting
    // again on every scroll-load would be wasted DB work.
    offset === 0 ? prisma.ticket.count({ where }) : Promise.resolve(0),
  ])
  return toPage(rows, offset, total)
}

/** Maps a queue scope to a status filter (undefined = no status constraint). */
function scopeFilter(scope: TicketQuery["scope"]): Prisma.TicketWhereInput["status"] {
  switch (scope) {
    case "open":
      return "OPEN"
    case "in_progress":
      return "IN_PROGRESS"
    case "resolved":
      return "RESOLVED"
    case "closed":
      return "CLOSED"
    default:
      return undefined // "all" or unset
  }
}

/** The platform-wide queue across every institute (super admin only). */
export async function listQueue(filters: TicketQuery, offset = 0): Promise<TicketPage> {
  const where: Prisma.TicketWhereInput = {}
  const status = scopeFilter(filters.scope)
  if (status !== undefined) where.status = status
  if (filters.priority) where.priority = filters.priority
  if (filters.q) {
    where.OR = [
      { subject: { contains: filters.q, mode: "insensitive" } },
      { institute: { name: { contains: filters.q, mode: "insensitive" } } },
      { requester: { name: { contains: filters.q, mode: "insensitive" } } },
    ]
  }
  const [rows, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      // Highest priority first, newest within a priority.
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: LIST_INCLUDE,
      skip: offset,
      take: TICKET_PAGE_SIZE + 1,
    }),
    // Only count on the first page — the UI reads total from page 0, so counting
    // again on every scroll-load would be wasted DB work.
    offset === 0 ? prisma.ticket.count({ where }) : Promise.resolve(0),
  ])
  return toPage(rows, offset, total)
}

/** Detail + reply thread, authorized to the viewer. */
export function getTicket(id: string, viewer: TicketViewer): Promise<TicketDetail> {
  return loadDetail(id, viewer)
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function createTicket(
  instituteId: string,
  requesterId: string,
  input: TicketCreateInput
): Promise<TicketListItem> {
  const t = await prisma.ticket.create({
    data: {
      instituteId,
      requesterId,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
    },
    include: LIST_INCLUDE,
  })
  return toListItem(t)
}

/** Super-admin triage: change status/priority/category; maintain `resolvedAt`. */
export async function triageTicket(
  id: string,
  input: TicketTriageInput,
  viewer: TicketViewer
): Promise<TicketDetail> {
  if (!viewer.isSuperAdmin) throw new ForbiddenError()
  const existing = await prisma.ticket.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Ticket not found.")

  const data: Prisma.TicketUpdateInput = {}
  if (input.status) {
    data.status = input.status
    data.resolvedAt = nextResolvedAt(existing, input.status, new Date())
  }
  if (input.priority) data.priority = input.priority
  if (input.category) data.category = input.category

  await prisma.ticket.update({ where: { id }, data })
  return loadDetail(id, viewer)
}

/** Reopen a resolved/closed ticket — requester or super admin. */
export async function reopenTicket(
  id: string,
  viewer: TicketViewer
): Promise<TicketDetail> {
  const existing = await prisma.ticket.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Ticket not found.")
  const isRequester =
    existing.requesterId != null && existing.requesterId === viewer.viewerId
  if (!viewer.isSuperAdmin && !isRequester) throw new ForbiddenError()

  await prisma.ticket.update({
    where: { id },
    data: { status: "OPEN", resolvedAt: null },
  })
  return loadDetail(id, viewer)
}

/** Append a reply. Staff flag is stamped from the viewer's super-admin status. */
export async function addComment(
  id: string,
  input: CommentCreateInput,
  viewer: TicketViewer
): Promise<TicketDetail> {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { requesterId: true, instituteId: true },
  })
  if (!ticket) throw new NotFoundError("Ticket not found.")
  authorize(ticket, viewer)

  await prisma.ticketComment.create({
    data: {
      ticketId: id,
      authorId: viewer.viewerId,
      body: input.body,
      authorIsStaff: viewer.isSuperAdmin,
    },
  })
  return loadDetail(id, viewer)
}
