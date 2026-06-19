"use client"

import { useState } from "react"
import { Headset, RotateCcw, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { AVATAR_TINTS as AVATAR } from "@/lib/constants"
import { getInitials } from "@/lib/format"
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
  type TicketCategoryValue,
  type TicketPriorityValue,
  type TicketStatusValue,
} from "@/features/tickets/schema"
import type { TicketComment, TicketDetail } from "@/features/tickets/types"
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
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from "@/features/tickets/components/ticket-badges"

export function TicketDetailView({ id }: { id: string }) {
  const { data: ticket, isLoading } = useTicket(id)

  if (isLoading || !ticket) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  const done = ticket.status === "RESOLVED" || ticket.status === "CLOSED"

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/tickets" label="Tickets" />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <CategoryBadge category={ticket.category} />
        </div>
        <p className="text-muted-foreground text-sm">
          Opened {formatRelative(ticket.createdAt)} by{" "}
          <span className="text-foreground font-medium">
            {ticket.requesterName ?? "Unknown"}
          </span>
          {ticket.instituteName ? ` · ${ticket.instituteName}` : ""}
          {ticket.resolvedAt ? ` · resolved ${formatRelative(ticket.resolvedAt)}` : ""}
        </p>
      </div>

      {/* Triage (super admin only) */}
      {ticket.canManage && <TriagePanel id={id} ticket={ticket} />}

      {/* Description */}
      <div className="bg-card rounded-2xl border p-4">
        <p className="text-sm whitespace-pre-wrap break-words">{ticket.description}</p>
      </div>

      {/* Conversation */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">
          Conversation
          {ticket.comments.length > 0 ? ` · ${ticket.comments.length}` : ""}
        </h2>
        {ticket.comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No replies yet. {ticket.canManage ? "Reply to the requester below." : "We'll respond here."}
          </p>
        ) : (
          <div className="space-y-3">
            {ticket.comments.map((c, i) => (
              <CommentBubble key={c.id} comment={c} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Reply composer + reopen */}
      <ReplyComposer
        id={id}
        status={ticket.status}
        canReopen={done && ticket.isRequester}
      />
    </div>
  )
}

function TriagePanel({ id, ticket }: { id: string; ticket: TicketDetail }) {
  const triage = useTriageTicket(id)
  return (
    <div className="bg-muted/40 grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-3">
      <Field label="Status">
        <Select
          value={ticket.status}
          onValueChange={(v) =>
            v !== ticket.status && triage.mutate({ status: v as TicketStatusValue })
          }
          disabled={triage.isPending}
        >
          <SelectTrigger className="w-full" aria-label="Status">
            <SelectValue>
              {(v: string) => STATUS_LABELS[v as TicketStatusValue] ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Priority">
        <Select
          value={ticket.priority}
          onValueChange={(v) =>
            v !== ticket.priority && triage.mutate({ priority: v as TicketPriorityValue })
          }
          disabled={triage.isPending}
        >
          <SelectTrigger className="w-full" aria-label="Priority">
            <SelectValue>
              {(v: string) => PRIORITY_LABELS[v as TicketPriorityValue] ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Category">
        <Select
          value={ticket.category}
          onValueChange={(v) =>
            v !== ticket.category && triage.mutate({ category: v as TicketCategoryValue })
          }
          disabled={triage.isPending}
        >
          <SelectTrigger className="w-full" aria-label="Category">
            <SelectValue>
              {(v: string) => CATEGORY_LABELS[v as TicketCategoryValue] ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TICKET_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}

function CommentBubble({ comment, index }: { comment: TicketComment; index: number }) {
  const name = comment.authorName ?? "Unknown"
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        comment.authorIsStaff
          ? "border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-500/10"
          : "bg-card"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            comment.authorIsStaff
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
              : AVATAR[index % AVATAR.length]
          )}
        >
          {comment.authorIsStaff ? <Headset className="size-4" /> : getInitials(name)}
        </span>
        <span className="text-sm font-medium">{name}</span>
        {comment.authorIsStaff && (
          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-indigo-700 uppercase dark:bg-indigo-500/20 dark:text-indigo-200">
            Support
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {formatRelative(comment.createdAt)}
        </span>
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap break-words">{comment.body}</p>
    </div>
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
    <div className="bg-card space-y-3 rounded-2xl border p-4">
      {done && (
        <p className="text-muted-foreground text-xs">
          This ticket is {STATUS_LABELS[status].toLowerCase()}.
          {canReopen ? " Use “Reopen” if you still need help." : ""}
        </p>
      )}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a reply…"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send()
        }}
      />
      <div className="flex items-center justify-between gap-2">
        {canReopen ? (
          <Button
            type="button"
            variant="outline"
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
  )
}
