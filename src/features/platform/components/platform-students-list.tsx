"use client"

import { useEffect, useState } from "react"
import { Search, Users } from "lucide-react"
import type { StudentStatus } from "@prisma/client"

import { FILTER_ALL as ALL } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { formatClassName, formatCurrency } from "@/lib/format"
import { STUDENT_STATUSES } from "@/features/students/schema"
import { StudentAvatar } from "@/features/students/components/student-avatar"
import {
  StudentStatusBadge,
  STUDENT_STATUS_LABEL,
} from "@/features/students/components/student-status-badge"
import { usePlatformStudents } from "@/features/platform/hooks"
import { Input } from "@/components/ui/input"
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

// "ARCHIVED" is a pseudo-status — it filters on archivedAt, not the status enum.
const ARCHIVED = "ARCHIVED"
const STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  ...STUDENT_STATUSES.map((s) => ({ value: s, label: STUDENT_STATUS_LABEL[s] })),
  { value: ARCHIVED, label: "Archived" },
]

// Cross-tenant student directory: one dense row per student across every
// institute. Read-only (acting on a student means switching into its institute),
// so rows don't link — the institute is shown instead of the per-institute class
// filter the roster has.
export function PlatformStudentsList() {
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>(ALL)

  // Debounce the search box into the server query.
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const isArchived = status === ARCHIVED
  const { items, total, isLoading, isPlaceholder, hasMore, loadMore, isLoadingMore } =
    usePlatformStudents({
      q: q || undefined,
      status: status === ALL || isArchived ? undefined : (status as StudentStatus),
      archived: isArchived || undefined,
    })

  const hasFilters = q.length > 0 || status !== ALL

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, guardian, contact, or ID…"
            className="h-8 pl-9"
          />
        </div>
        <div className="w-36 shrink-0">
          <Select value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
            <SelectTrigger className="w-full data-[size=default]:h-8">
              <SelectValue placeholder="Status">
                {(v: string) =>
                  STATUS_OPTIONS.find((o) => o.value === v)?.label ?? "All statuses"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && total > 0 && (
        <p className="text-muted-foreground text-xs">
          {total} {total === 1 ? "student" : "students"} across all institutes
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] rounded-xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className={cn(isPlaceholder && "opacity-60")}>
          <div className="divide-y rounded-xl border bg-card">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 px-3 py-2">
                <StudentAvatar photoUrl={s.photoUrl} seed={s.id} name={s.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{s.fullName}</span>
                    {s.status !== "ACTIVE" && (
                      <StudentStatusBadge
                        status={s.status}
                        className="shrink-0 px-1.5 py-0 text-[10px]"
                      />
                    )}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    <span className="text-foreground/70 font-medium">{s.instituteName}</span>
                    {` · ID ${s.serialNo}`}
                    {s.className ? ` · ${formatClassName(s.className, s.classSection)}` : ""}
                    {s.guardianName ? ` · ${s.guardianName}` : ""}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(s.monthlyFee)}
                </span>
              </div>
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
          icon={Users}
          title="No students found"
          description={
            hasFilters
              ? "Try adjusting your search or filters."
              : "Students appear here as institutes add them."
          }
        />
      )}
    </div>
  )
}
