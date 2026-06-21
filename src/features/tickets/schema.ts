import { z } from "zod"

// Ticket enums mirrored as const tuples so zod, service ordering, and UI badges
// all read from one source. Values match the Prisma enums (kept separate from the
// notes board's NotePriority so ticket triage can evolve independently).

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const
export type TicketStatusValue = (typeof TICKET_STATUSES)[number]

export const TICKET_CATEGORIES = [
  "BUG",
  "FEATURE",
  "QUESTION",
  "BILLING",
  "OTHER",
] as const
export type TicketCategoryValue = (typeof TICKET_CATEGORIES)[number]

export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const
export type TicketPriorityValue = (typeof TICKET_PRIORITIES)[number]

export const STATUS_LABELS: Record<TicketStatusValue, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

export const CATEGORY_LABELS: Record<TicketCategoryValue, string> = {
  BUG: "Bug",
  FEATURE: "Feature request",
  QUESTION: "Question",
  BILLING: "Billing",
  OTHER: "Other",
}

export const PRIORITY_LABELS: Record<TicketPriorityValue, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
}

// Queue scope — the four real statuses (1:1 with the ticket status) plus "all",
// which drops the filter. No synthetic buckets: every chip matches a status badge.
export const TICKET_SCOPES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "all",
] as const
export type TicketScope = (typeof TICKET_SCOPES)[number]

export const SCOPE_LABELS: Record<TicketScope, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  all: "All",
}

// How many tickets a list page returns; the rest load on scroll (infinite query).
export const TICKET_PAGE_SIZE = 30

// ─── API / domain contract ────────────────────────────────────────────────────

export const ticketCreateSchema = z.object({
  subject: z.string().trim().min(1, "Add a short subject.").max(200),
  // Optional — when blank the service falls back to the subject as the description.
  description: z.string().trim().max(5000).optional().default(""),
  category: z.enum(TICKET_CATEGORIES).default("QUESTION"),
  priority: z.enum(TICKET_PRIORITIES).default("NORMAL"),
})
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>

// Super-admin triage. Any subset of the three fields; at least one is required.
export const ticketTriageSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
  })
  .refine((v) => v.status != null || v.priority != null || v.category != null, {
    message: "Nothing to update.",
  })
export type TicketTriageInput = z.infer<typeof ticketTriageSchema>

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1, "Write a reply first.").max(5000),
})
export type CommentCreateInput = z.infer<typeof commentCreateSchema>

// Queue filters (super-admin). All optional; the client omits a param to clear it.
export const ticketQuerySchema = z.object({
  scope: z.enum(TICKET_SCOPES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  q: z.string().trim().optional(),
})
export type TicketQuery = z.infer<typeof ticketQuerySchema>

// ─── Client form model ────────────────────────────────────────────────────────

export const ticketFormSchema = z.object({
  subject: z.string().trim().min(1, "Add a short subject.").max(200),
  // Optional — left blank, the subject is reused as the description on submit.
  description: z.string().trim().max(5000),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
})
export type TicketFormValues = z.infer<typeof ticketFormSchema>
