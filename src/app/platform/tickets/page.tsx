import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getSuperAdminContext } from "@/lib/tenant"
import { makeServerQueryClient } from "@/lib/query"
import { ticketKeys } from "@/features/tickets/api"
import { listQueue } from "@/features/tickets/service"
import { TicketQueue } from "@/features/tickets/components/ticket-queue"

export const metadata: Metadata = { title: "Tickets" }

// The cross-institute triage queue — the same self-contained component the super
// admin already gets at /tickets, surfaced in the platform area. Prefetch the
// first "open" page so it renders with data, not a skeleton.
export default async function PlatformTicketsPage() {
  await getSuperAdminContext() // layout already gates; explicit + consistent
  const filters = { scope: "open" as const }

  const qc = makeServerQueryClient()
  await qc.prefetchInfiniteQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => listQueue(filters, 0),
    initialPageParam: 0,
  })

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="mx-auto max-w-5xl">
        <TicketQueue />
      </div>
    </HydrationBoundary>
  )
}
