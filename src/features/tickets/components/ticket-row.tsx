import Link from "next/link"
import { MessageSquare } from "lucide-react"

import { cn } from "@/lib/utils"
import { AVATAR_TINTS as AVATAR } from "@/lib/constants"
import { getInitials } from "@/lib/format"
import { formatRelative } from "@/lib/date-helper"
import { CATEGORY_LABELS } from "@/features/tickets/schema"
import type { TicketListItem } from "@/features/tickets/types"
import { PriorityBadge, StatusBadge } from "@/features/tickets/components/ticket-badges"

/** One ticket in a list. Shared by the member list and the super-admin queue; the
 *  queue passes `showInstitute` so the tenant is visible across institutes. */
export function TicketRow({
  ticket,
  index,
  showInstitute = false,
}: {
  ticket: TicketListItem
  index: number
  showInstitute?: boolean
}) {
  const who = ticket.requesterName ?? "Unknown"
  const meta = [
    CATEGORY_LABELS[ticket.category],
    showInstitute ? ticket.instituteName : null,
    who,
    formatRelative(ticket.createdAt),
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="bg-card hover:bg-muted/40 flex items-center gap-3 rounded-2xl border p-3 transition-colors"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          AVATAR[index % AVATAR.length]
        )}
      >
        {getInitials(who)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{ticket.subject}</span>
          {ticket.priority !== "NORMAL" && <PriorityBadge priority={ticket.priority} />}
        </div>
        <div className="text-muted-foreground truncate text-xs">{meta}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={ticket.status} />
        {ticket.commentCount > 0 && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums">
            <MessageSquare className="size-3" />
            {ticket.commentCount}
          </span>
        )}
      </div>
    </Link>
  )
}
