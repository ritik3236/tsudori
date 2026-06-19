import Link from "next/link"
import { MessageSquare } from "lucide-react"

import { formatRelative } from "@/lib/date-helper"
import { CATEGORY_LABELS } from "@/features/tickets/schema"
import type { TicketListItem } from "@/features/tickets/types"
import { PriorityBadge, StatusBadge } from "@/features/tickets/components/ticket-badges"

/** One ticket in a list. Shared by the member list and the super-admin queue; the
 *  queue passes `showInstitute` only when more than one institute is present. No
 *  avatar — the requester's name reads more clearly in the meta line than cryptic
 *  initials, and dropping it lets the subject use the full width. */
export function TicketRow({
  ticket,
  showInstitute = false,
}: {
  ticket: TicketListItem
  showInstitute?: boolean
}) {
  const meta = [
    CATEGORY_LABELS[ticket.category],
    showInstitute ? ticket.instituteName : null,
    ticket.requesterName ?? "Unknown",
    formatRelative(ticket.createdAt),
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="bg-card hover:bg-muted/40 block rounded-2xl border p-3 transition-colors"
    >
      <div className="flex items-start gap-2">
        <p className="line-clamp-2 flex-1 text-sm font-medium">{ticket.subject}</p>
        <StatusBadge status={ticket.status} className="mt-0.5 shrink-0" />
      </div>
      <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
        {ticket.priority !== "NORMAL" && (
          <PriorityBadge priority={ticket.priority} className="shrink-0" />
        )}
        <span className="truncate">{meta}</span>
        {ticket.commentCount > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 tabular-nums">
            <MessageSquare className="size-3" />
            {ticket.commentCount}
          </span>
        )}
      </div>
    </Link>
  )
}
