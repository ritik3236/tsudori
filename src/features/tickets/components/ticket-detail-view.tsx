"use client"

import { useState } from "react"
import { RotateCcw, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/date-helper"
import {
  useAddComment,
  useReopenTicket,
  useTicket,
  useTriageTicket,
} from "@/features/tickets/hooks"
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketStatusValue,
} from "@/features/tickets/schema"
import type { TicketDetail } from "@/features/tickets/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BackLink } from "@/components/shared/back-link"
import {
  CATEGORY_STYLE,
  CategoryBadge,
  PRIORITY_STYLE,
  PriorityBadge,
  STATUS_STYLE,
  StatusBadge,
} from "@/features/tickets/components/ticket-badges"

export function TicketDetailView({ id }: { id: string }) {
  const { data: ticket, isLoading } = useTicket(id)
  const triage = useTriageTicket(id)

  if (isLoading || !ticket) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  const done = ticket.status === "RESOLVED" || ticket.status === "CLOSED"

  return (
    // Fill the viewport so the reply box can sit at the bottom even on a short
    // ticket; the flex-1 spacer below pushes it down when there's slack, and the
    // composer stays sticky for long threads.
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4">
      <BackLink href="/tickets" label="Tickets" />

      {/* Title block — plain (no card). The status/priority/category chips are
          editable in place for the super admin (click → pick → saves immediately),
          and plain read-only badges for everyone else. No separate triage panel. */}
      <header className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {ticket.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {ticket.canManage ? (
            <>
              <TriageChip
                value={ticket.status}
                options={TICKET_STATUSES}
                labels={STATUS_LABELS}
                styleMap={STATUS_STYLE}
                ariaLabel="Status"
                disabled={triage.isPending}
                onChange={(v) => triage.mutate({ status: v })}
              />
              <TriageChip
                value={ticket.priority}
                options={TICKET_PRIORITIES}
                labels={PRIORITY_LABELS}
                styleMap={PRIORITY_STYLE}
                ariaLabel="Priority"
                disabled={triage.isPending}
                onChange={(v) => triage.mutate({ priority: v })}
              />
              <TriageChip
                value={ticket.category}
                options={TICKET_CATEGORIES}
                labels={CATEGORY_LABELS}
                styleMap={CATEGORY_STYLE}
                ariaLabel="Category"
                disabled={triage.isPending}
                onChange={(v) => triage.mutate({ category: v })}
              />
            </>
          ) : (
            <>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <CategoryBadge category={ticket.category} />
            </>
          )}
          {ticket.instituteName && (
            <span className="text-muted-foreground ml-1 text-xs">
              {ticket.instituteName}
            </span>
          )}
        </div>
      </header>

      {/* Conversation — chat bubbles. The request is the first (reporter) bubble;
          consecutive messages from the same person are grouped so the name shows
          once, not on every reply. */}
      <ChatThread ticket={ticket} />

      {/* Pushes the reply box to the bottom when the ticket is short. */}
      <div className="flex-1" aria-hidden="true" />

      {/* Composer */}
      <ReplyComposer
        id={id}
        status={ticket.status}
        canReopen={done && ticket.isRequester}
      />
    </div>
  )
}

type ThreadMessage = {
  id: string
  name: string
  body: string
  isStaff: boolean
  time: string
}

function ChatThread({ ticket }: { ticket: TicketDetail }) {
  // The reporter's request is the first message; replies follow.
  const messages: ThreadMessage[] = [
    {
      id: "request",
      name: ticket.requesterName ?? "Unknown",
      body: ticket.description,
      isStaff: false,
      time: ticket.createdAt,
    },
    ...ticket.comments.map((c) => ({
      id: c.id,
      name: c.authorName ?? "Unknown",
      body: c.body,
      isStaff: c.authorIsStaff,
      time: c.createdAt,
    })),
  ]

  // Collapse consecutive messages from the same author into one group so the
  // name/timestamp aren't repeated on every bubble.
  const groups: { key: string; name: string; isStaff: boolean; items: ThreadMessage[] }[] = []
  for (const m of messages) {
    const last = groups[groups.length - 1]
    if (last && last.isStaff === m.isStaff && last.name === m.name) {
      last.items.push(m)
    } else {
      groups.push({ key: m.id, name: m.name, isStaff: m.isStaff, items: [m] })
    }
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <BubbleGroup key={g.key} group={g} />
      ))}
    </div>
  )
}

function BubbleGroup({
  group,
}: {
  group: { name: string; isStaff: boolean; items: ThreadMessage[] }
}) {
  const staff = group.isStaff
  const last = group.items[group.items.length - 1]
  return (
    <div className={cn("flex flex-col gap-1", staff ? "items-end" : "items-start")}>
      <span className="text-muted-foreground px-1 text-[11px] font-medium">
        {group.name}
        {staff && (
          <span className="text-indigo-600 dark:text-indigo-300"> · Support</span>
        )}
      </span>
      {group.items.map((m) => (
        <div
          key={m.id}
          className={cn(
            "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
            staff
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "bg-card text-foreground rounded-tl-sm border"
          )}
        >
          {m.body}
        </div>
      ))}
      <span className="text-muted-foreground px-1 text-[11px]">
        {formatRelative(last.time)}
      </span>
    </div>
  )
}

// An editable status/priority/category value rendered as a coloured chip (same
// look as the read-only badges) that opens a dropdown and saves on pick — mirrors
// the notes board's inline priority chip. The `!` overrides shrink the Base UI
// trigger from a button down to chip dimensions.
function TriageChip<T extends string>({
  value,
  options,
  labels,
  styleMap,
  onChange,
  ariaLabel,
  disabled,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string>
  styleMap: Record<T, string>
  onChange: (value: T) => void
  ariaLabel: string
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => v !== value && onChange(v as T)}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-auto! w-auto gap-1 rounded! border-0! px-1.5! py-0.5! text-[10px]! font-semibold tracking-wide uppercase shadow-none [&>svg]:size-2.5 [&>svg]:text-current [&>svg]:opacity-70",
          styleMap[value]
        )}
      >
        <SelectValue>{(v: string) => labels[v as T]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ReplyComposer({
  id,
  status,
  canReopen,
}: {
  id: string
  status: TicketStatusValue
  canReopen: boolean
}) {
  const [body, setBody] = useState("")
  const addComment = useAddComment(id)
  const reopen = useReopenTicket(id)

  const done = status === "RESOLVED" || status === "CLOSED"
  const text = body.trim()
  const send = () => {
    if (!text) return
    addComment.mutate({ body: text }, { onSuccess: () => setBody("") })
  }

  return (
    // Pinned to the bottom while the thread scrolls behind it (offset clears the
    // fixed mobile bottom-nav). Sticky, not fixed, so a short ticket keeps it in
    // normal flow and it never hides the last message.
    <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 lg:bottom-4">
      <div className="bg-card focus-within:border-ring focus-within:ring-ring/50 rounded-2xl border shadow-sm transition-colors focus-within:ring-3">
        {done && (
          <p className="text-muted-foreground px-3 pt-2.5 text-xs">
            This ticket is {STATUS_LABELS[status].toLowerCase()}.
            {canReopen ? " Use “Reopen” if you still need help." : ""}
          </p>
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Write a reply…"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send()
          }}
          className="min-h-0 resize-none border-0 bg-transparent px-3 pt-2.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          {canReopen ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => reopen.mutate()}
              disabled={reopen.isPending}
            >
              <RotateCcw className="size-4" /> {reopen.isPending ? "Reopening…" : "Reopen"}
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={send} disabled={!text || addComment.isPending} size="sm">
            <Send className="size-4" /> {addComment.isPending ? "Sending…" : "Reply"}
          </Button>
        </div>
      </div>
    </div>
  )
}
