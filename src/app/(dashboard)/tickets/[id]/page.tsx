import type { Metadata } from "next"
import { forbidden, notFound } from "next/navigation"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getTenantContext } from "@/lib/tenant"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { makeServerQueryClient } from "@/lib/query"
import { ticketKeys } from "@/features/tickets/api"
import { getTicket } from "@/features/tickets/service"
import { toTicketViewer } from "@/features/tickets/viewer"
import { TicketDetailView } from "@/features/tickets/components/ticket-detail-view"

export const metadata: Metadata = { title: "Ticket" }

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getTenantContext()

  let ticket: Awaited<ReturnType<typeof getTicket>>
  try {
    ticket = await getTicket(id, toTicketViewer(ctx))
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    if (error instanceof ForbiddenError) forbidden()
    throw error
  }

  // Authorization already ran above; seed the cache with the loaded detail so the
  // client view hydrates without a second fetch.
  const qc = makeServerQueryClient()
  qc.setQueryData(ticketKeys.detail(id), ticket)

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <TicketDetailView id={id} />
    </HydrationBoundary>
  )
}
