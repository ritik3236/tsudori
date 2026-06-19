"use client"

import { useState } from "react"
import { Search, Ticket } from "lucide-react"

import { cn } from "@/lib/utils"
import { FILTER_ALL as ALL } from "@/lib/constants"
import { useTickets } from "@/features/tickets/hooks"
import {
  PRIORITY_LABELS,
  SCOPE_LABELS,
  TICKET_PRIORITIES,
  TICKET_SCOPES,
  type TicketPriorityValue,
  type TicketScope,
} from "@/features/tickets/schema"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TicketRow } from "@/features/tickets/components/ticket-row"

/** Super-admin view: the cross-institute work queue with scope/priority/search filters. */
export function TicketQueue() {
  const [scope, setScope] = useState<TicketScope>("active")
  const [priority, setPriority] = useState<TicketPriorityValue | typeof ALL>(ALL)
  const [q, setQ] = useState("")

  const { data: tickets, isLoading } = useTickets({
    scope,
    priority: priority === ALL ? undefined : priority,
    q: q.trim() || undefined,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Support queue</h1>
        <p className="text-muted-foreground text-sm">
          Tickets from every institute. Highest priority first.
        </p>
      </div>

      {/* Scope chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TICKET_SCOPES.map((s) => {
          const active = s === scope
          return (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "bg-card hover:bg-muted/50 text-muted-foreground"
              )}
            >
              {SCOPE_LABELS[s]}
            </button>
          )
        })}
      </div>

      {/* Search + priority filter */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subject, institute, or requester…"
            className="pl-9"
          />
        </div>
        <Select
          value={priority}
          onValueChange={(v) => setPriority((v as TicketPriorityValue | typeof ALL) ?? ALL)}
        >
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue placeholder="Priority">
              {(v: string) =>
                v === ALL
                  ? "All priorities"
                  : (PRIORITY_LABELS[v as TicketPriorityValue] ?? "Priority")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-2xl" />
          ))}
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets here"
          description="Nothing matches this filter. Try a different scope or clear the search."
        />
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </p>
          <div className="space-y-2.5">
            {tickets.map((t, i) => (
              <TicketRow key={t.id} ticket={t} index={i} showInstitute />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
