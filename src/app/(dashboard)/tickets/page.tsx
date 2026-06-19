import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { ticketKeys } from "@/features/tickets/api"
import { listMyTickets, listQueue } from "@/features/tickets/service"
import { MyTickets } from "@/features/tickets/components/my-tickets"
import { TicketQueue } from "@/features/tickets/components/ticket-queue"

export const metadata: Metadata = { title: "Tickets" }

// One route, two experiences (no permission gate — membership only): the platform
// super admin gets the cross-institute triage queue; everyone else gets their own
// tickets (institute admins see all of their institute's).
export default async function TicketsPage() {
  const ctx = await getTenantContext()
  const qc = makeServerQueryClient()

  if (ctx.isSuperAdmin) {
    const filters = { scope: "open" as const }
    await qc.prefetchInfiniteQuery({
      queryKey: ticketKeys.list(filters),
      queryFn: () => listQueue(filters, 0),
      initialPageParam: 0,
    })
    return (
      <HydrationBoundary state={dehydrate(qc)}>
        <TicketQueue />
      </HydrationBoundary>
    )
  }

  const isInstituteAdmin = can(ctx, PERMISSIONS.INSTITUTE_MANAGE)
  await qc.prefetchInfiniteQuery({
    queryKey: ticketKeys.list(),
    queryFn: () => listMyTickets(ctx.institute.id, ctx.user.id, isInstituteAdmin, 0),
    initialPageParam: 0,
  })
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <MyTickets />
    </HydrationBoundary>
  )
}
