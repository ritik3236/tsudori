import { buildQuery, http } from "@/lib/http"
import type { TicketDetail, TicketListItem } from "@/features/tickets/types"
import type {
  CommentCreateInput,
  TicketCreateInput,
  TicketQuery,
  TicketTriageInput,
} from "@/features/tickets/schema"

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (filters?: TicketQuery) => [...ticketKeys.lists(), filters ?? {}] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
}

export const ticketsApi = {
  list: (filters?: TicketQuery) =>
    http.get<TicketListItem[]>(`/api/tickets${buildQuery(filters ?? {})}`),
  create: (data: TicketCreateInput) => http.post<TicketListItem>("/api/tickets", data),
  detail: (id: string) => http.get<TicketDetail>(`/api/tickets/${id}`),
  triage: (id: string, data: TicketTriageInput) =>
    http.patch<TicketDetail>(`/api/tickets/${id}`, data),
  reopen: (id: string) => http.patch<TicketDetail>(`/api/tickets/${id}`, { reopen: true }),
  addComment: (id: string, data: CommentCreateInput) =>
    http.post<TicketDetail>(`/api/tickets/${id}/comments`, data),
}
