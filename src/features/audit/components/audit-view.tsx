"use client"

import { useState } from "react"
import Link from "next/link"
import { ScrollText } from "lucide-react"

import { cn } from "@/lib/utils"
import { FILTER_ALL as ALL } from "@/lib/constants"
import { formatCurrency } from "@/lib/format"
import { formatRelative } from "@/lib/date-helper"
import { useAuditLog } from "@/features/audit/hooks"
import { useMembers } from "@/features/members/hooks"
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ENTITY_FILTERS,
  auditEntityHref,
} from "@/features/audit/labels"
import type { AuditLogItem } from "@/features/audit/types"
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

export function AuditView() {
  const [actorId, setActorId] = useState<string>(ALL)
  const [entityType, setEntityType] = useState<string>(ALL)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  // Actor dropdown is populated from the team list (audit viewers are admins /
  // auditors, who also hold member:read). Degrades gracefully if not.
  const { data: members } = useMembers()

  const { items, total, isLoading, isPlaceholder, hasMore, loadMore, isLoadingMore } =
    useAuditLog({
      actorId: actorId === ALL ? undefined : actorId,
      entityType: entityType === ALL ? undefined : entityType,
      from: from || undefined,
      to: to || undefined,
    })

  const hasFilters = actorId !== ALL || entityType !== ALL || !!from || !!to

  return (
    <div className="space-y-4">
      {/* Filters: actor · type · from · to */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Select value={actorId} onValueChange={(v) => setActorId(v ?? ALL)}>
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

      {!isLoading && total > 0 && (
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
              <AuditRow key={e.id} e={e} />
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
              : "Sensitive changes — reversals, role changes, archives — will show up here."
          }
        />
      )}
    </div>
  )
}

function AuditRow({ e }: { e: AuditLogItem }) {
  const m = e.metadata ?? {}
  const str = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null)
  const name = str("studentName") ?? str("memberName") ?? str("roleName")
  const amount = typeof m.amount === "number" ? formatCurrency(m.amount) : null
  const reason = str("reason")
  const detail = [name, amount].filter(Boolean).join(" · ")
  const href = auditEntityHref(e.action, e.entityId, e.metadata)

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{e.actorName ?? "Someone"}</span>{" "}
          <span className="text-muted-foreground">
            {AUDIT_ACTION_LABEL[e.action] ?? e.action}
          </span>
        </p>
        {detail && <p className="text-muted-foreground truncate text-xs">{detail}</p>}
        {reason && (
          <p className="text-muted-foreground/80 truncate text-xs italic">“{reason}”</p>
        )}
      </div>
      <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
        {formatRelative(e.createdAt)}
      </span>
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
