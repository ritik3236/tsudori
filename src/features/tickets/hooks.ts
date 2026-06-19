"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { ticketKeys, ticketsApi } from "@/features/tickets/api"
import type {
  CommentCreateInput,
  TicketCreateInput,
  TicketQuery,
  TicketTriageInput,
} from "@/features/tickets/schema"
import type { TicketDetail } from "@/features/tickets/types"

export { ticketKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

// Infinite scroll: each page returns up to TICKET_PAGE_SIZE rows plus a
// nextOffset cursor; the component fetches the next page as the sentinel scrolls
// into view, so 500 tickets never load at once.
export function useTickets(filters?: TicketQuery) {
  return useInfiniteQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: ({ pageParam }) => ticketsApi.list(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketsApi.detail(id),
    enabled: !!id,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TicketCreateInput) => ticketsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.lists() })
      toast.success("Ticket created.")
    },
    onError: (e) => reportError(e, "Couldn't create the ticket."),
  })
}

// Triage, reopen, and reply all return the refreshed detail, so we seed the
// detail cache directly and invalidate the lists (status/priority may have moved).
function onDetailMutation(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  detail: TicketDetail
) {
  qc.setQueryData(ticketKeys.detail(id), detail)
  qc.invalidateQueries({ queryKey: ticketKeys.lists() })
}

export function useTriageTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TicketTriageInput) => ticketsApi.triage(id, data),
    onSuccess: (detail) => {
      onDetailMutation(qc, id, detail)
      toast.success("Ticket updated.")
    },
    onError: (e) => reportError(e, "Couldn't update the ticket."),
  })
}

export function useReopenTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => ticketsApi.reopen(id),
    onSuccess: (detail) => {
      onDetailMutation(qc, id, detail)
      toast.success("Ticket reopened.")
    },
    onError: (e) => reportError(e, "Couldn't reopen the ticket."),
  })
}

export function useAddComment(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CommentCreateInput) => ticketsApi.addComment(id, data),
    onSuccess: (detail) => {
      onDetailMutation(qc, id, detail)
    },
    onError: (e) => reportError(e, "Couldn't post your reply."),
  })
}
