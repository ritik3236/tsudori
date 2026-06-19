"use client"

import { Ticket } from "lucide-react"

import { useTickets } from "@/features/tickets/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { NewTicketButton } from "@/features/tickets/components/new-ticket-button"
import { TicketRow } from "@/features/tickets/components/ticket-row"
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel"

/** Member view: the tickets you've raised (institute admins see all of theirs). */
export function MyTickets() {
  const { items: tickets, isLoading, hasMore, loadMore, isLoadingMore } =
    useTickets()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-2xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets yet"
          description="Raise your first ticket — the Tsudori team picks them up from here."
        />
      ) : (
        <>
          <div className="space-y-2.5">
            {tickets.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </div>
          <InfiniteSentinel
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={loadMore}
          />
        </>
      )}

      <NewTicketButton floating />
    </div>
  )
}
