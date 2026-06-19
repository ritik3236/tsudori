"use client"

import { Ticket } from "lucide-react"

import { useTickets } from "@/features/tickets/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { NewTicketButton } from "@/features/tickets/components/new-ticket-button"
import { TicketRow } from "@/features/tickets/components/ticket-row"

/** Member view: the tickets you've raised (institute admins see all of theirs). */
export function MyTickets({ canSeeAllInstitute }: { canSeeAllInstitute: boolean }) {
  const { data: tickets, isLoading } = useTickets()

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Support tickets</h1>
          <p className="text-muted-foreground text-sm">
            {canSeeAllInstitute
              ? "Tickets raised across your institute."
              : "Bugs, feature requests, and questions you've raised."}
          </p>
        </div>
        <NewTicketButton size="sm" />
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-2xl" />
          ))}
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets yet"
          description="Raise your first ticket — the Tsudori team picks them up from here."
          action={<NewTicketButton size="sm" variant="outline" />}
        />
      ) : (
        <div className="space-y-2.5">
          {tickets.map((t, i) => (
            <TicketRow key={t.id} ticket={t} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
