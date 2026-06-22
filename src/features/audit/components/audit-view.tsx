"use client"

import { useState } from "react"
import Link from "next/link"
import { ScrollText } from "lucide-react"

import { cn } from "@/lib/utils"
import { FILTER_ALL as ALL } from "@/lib/constants"
import { formatCurrency, getInitials } from "@/lib/format"
import { formatDateTime, formatRelative } from "@/lib/date-helper"
import { useAuditLog } from "@/features/audit/hooks"
import { useMembers } from "@/features/members/hooks"
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ENTITY_FILTERS,
  auditEntityHref,
} from "@/features/audit/labels"
import type { AuditLogItem } from "@/features/audit/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DatePicker } from "@/components/ui/date-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// `mine` renders the personal "your activity" variant: no actor filter (it's all
// the same person), data from the self-scoped /api/activity, and rows phrased in
// the first person. Default (admin) shows everyone in the institute.
export function AuditView({ mine = false }: { mine?: boolean }) {
  const [actorId, setActorId] = useState<string>(ALL)
  const [entityType, setEntityType] = useState<string>(ALL)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const { items, total, isLoading, isPlaceholder, hasMore, loadMore, isLoadingMore } =
    useAuditLog({
      mine: mine || undefined,
      actorId: mine || actorId === ALL ? undefined : actorId,
      entityType: entityType === ALL ? undefined : entityType,
      from: from || undefined,
      to: to || undefined,
    })

  const hasFilters =
    (!mine && actorId !== ALL) || entityType !== ALL || !!from || !!to

  return (
    <div className="space-y-3">
      {/* Filters: (actor ·) type · from · to — kept to a single compact row. */}
      <div
        className={cn(
          "grid gap-2",
          mine ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
        )}
      >
        {!mine && <ActorFilter value={actorId} onChange={setActorId} />}

        <Select value={entityType} onValueChange={(v) => setEntityType(v ?? ALL)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All types">
              {(v: string) =>
                v === ALL
                  ? "All types"
                  : (AUDIT_ENTITY_FILTERS.find((o) => o.value === v)?.label ?? "All types")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {AUDIT_ENTITY_FILTERS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DatePicker value={from} onChange={setFrom} placeholder="From" max={to || undefined} />
        <DatePicker value={to} onChange={setTo} placeholder="To" />
      </div>

      {!mine && !isLoading && total > 0 && (
        <p className="text-muted-foreground text-xs">
          {total} {total === 1 ? "event" : "events"}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] rounded-xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className={cn(isPlaceholder && "opacity-60")}>
          <div className="divide-y">
            {items.map((e) => (
              <AuditRow key={e.id} e={e} mine={mine} />
            ))}
          </div>
          <InfiniteSentinel
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={loadMore}
          />
        </div>
      ) : (
        <EmptyState
          icon={ScrollText}
          title={hasFilters ? "No matching events" : "No activity yet"}
          description={
            hasFilters
              ? "Try widening the filters."
              : mine
                ? "Your actions — fees you collect, sign-ins, password changes — show up here."
                : "Sensitive changes — reversals, role changes, archives — will show up here."
          }
        />
      )}
    </div>
  )
}

// Actor dropdown, populated from the team list. Split into its own component so
// the members query only runs in the admin view — the personal view hides this
// filter, and a regular member can't read the team list anyway.
function ActorFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { data: members } = useMembers()
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? ALL)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Anyone">
          {(v: string) =>
            v === ALL ? "Anyone" : (members?.find((m) => m.userId === v)?.name ?? "Anyone")
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Anyone</SelectItem>
        {(members ?? []).map((m) => (
          <SelectItem key={m.userId} value={m.userId}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AuditRow({ e, mine }: { e: AuditLogItem; mine: boolean }) {
  const m = e.metadata ?? {}
  const str = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null)
  const name = str("studentName") ?? str("memberName") ?? str("roleName")
  const amount = typeof m.amount === "number" ? formatCurrency(m.amount) : null
  const reason = str("reason")
  const ip = str("ip")
  const location = str("location")
  // One detail line: name · amount · location · ip · "reason" (whichever exist).
  const detail = [name, amount, location, ip, reason ? `“${reason}”` : null]
    .filter(Boolean)
    .join(" · ")
  const href = auditEntityHref(e.action, e.entityId, e.metadata)
  const who = mine ? "You" : (e.actorName ?? "Someone")

  const body = (
    <>
      <Avatar className="mt-0.5 size-8 shrink-0">
        {e.actorImage && (
          <AvatarImage src={e.actorImage} alt={e.actorName ?? ""} className="object-cover" />
        )}
        <AvatarFallback className="text-xs">
          {e.actorName ? getInitials(e.actorName) : "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{who}</span>{" "}
          <span className="text-muted-foreground">
            {AUDIT_ACTION_LABEL[e.action] ?? e.action}
          </span>
        </p>
        {detail && <p className="text-muted-foreground truncate text-xs">{detail}</p>}
      </div>
      <div className="shrink-0 text-right whitespace-nowrap" title={formatDateTime(e.createdAt)}>
        <p className="text-muted-foreground text-xs">{formatRelative(e.createdAt)}</p>
        <p className="text-muted-foreground/70 text-[11px]">{formatDateTime(e.createdAt)}</p>
      </div>
    </>
  )

  const base = "flex items-start gap-2.5 px-3 py-2.5"
  return href ? (
    <Link href={href} className={cn(base, "transition-colors hover:bg-muted/50")}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  )
}
