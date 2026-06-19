// Wire DTOs for support tickets. Dates normalised to ISO strings.

import type {
  TicketCategoryValue,
  TicketPriorityValue,
  TicketStatusValue,
} from "@/features/tickets/schema"

export type TicketListItem = {
  id: string
  subject: string
  category: TicketCategoryValue
  priority: TicketPriorityValue
  status: TicketStatusValue
  requesterName: string | null
  instituteId: string
  instituteName: string | null
  commentCount: number
  createdAt: string
  updatedAt: string
}

export type TicketComment = {
  id: string
  body: string
  authorName: string | null
  /** True when the comment was posted by the platform super admin (support). */
  authorIsStaff: boolean
  createdAt: string
}

export type TicketDetail = {
  id: string
  subject: string
  description: string
  category: TicketCategoryValue
  priority: TicketPriorityValue
  status: TicketStatusValue
  requesterId: string | null
  requesterName: string | null
  instituteId: string
  instituteName: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  comments: TicketComment[]
  /** Viewer is the platform super admin — may triage and reply as support. */
  canManage: boolean
  /** Viewer is the requester — may reply and reopen. */
  isRequester: boolean
}
