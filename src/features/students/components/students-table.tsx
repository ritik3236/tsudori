"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Users } from "lucide-react"
import type { StudentStatus } from "@prisma/client"

import { FILTER_ALL as ALL } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { formatClassName, formatCurrency } from "@/lib/format"
import { STUDENT_STATUSES } from "@/features/students/schema"
import { useClassOptions, useStudents } from "@/features/students/hooks"
import {
  StudentStatusBadge,
  STUDENT_STATUS_LABEL,
} from "@/features/students/components/student-status-badge"
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

// Soft tints (dark text on a light tint — WCAG AA), picked deterministically per
// student so the roster has colour and each row has a scannable anchor, instead
// of a flat grey wall of text.
const AVATAR_TONES = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
]

function avatarTone(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase() || "?"
}

// Profile photo with an initials fallback (no photo OR a broken URL). A plain
// <img> — not the Avatar primitive — so a cached blob image always paints.
function StudentAvatar({
  photoUrl,
  seed,
  name,
}: {
  photoUrl: string | null
  seed: string
  name: string
}) {
  const [broken, setBroken] = useState(false)
  if (photoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-9 shrink-0 rounded-full border object-cover"
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        avatarTone(seed)
      )}
    >
      {initials(name)}
    </span>
  )
}

type StudentsTableProps = {
  /** Lock the list to one class (class detail page) — hides the class filter and
   *  the redundant total count / class-in-subline. Omitted on the main page. */
  classId?: string
}

// Shared student list: one dense, tappable row per student (no table, no per-row
// actions — edit/archive live on the profile). Infinite scroll mirrors the fees
// month view, and is reused on the class detail page via the `classId` prop.
export function StudentsTable({ classId: lockedClassId }: StudentsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [classId, setClassId] = useState<string>(ALL)

  const { data: classes } = useClassOptions()
  const prefetchProfile = (id: string) => router.prefetch(`/students/${id}`)

  // Debounce the search box into the server query.
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const effectiveClassId = lockedClassId ?? (classId === ALL ? undefined : classId)

  const isArchived = status === ARCHIVED
  const { items, total, isLoading, isPlaceholder, hasMore, loadMore, isLoadingMore } =
    useStudents({
      q: q || undefined,
      status: status === ALL || isArchived ? undefined : (status as StudentStatus),
      archived: isArchived || undefined,
      classId: effectiveClassId,
    })

  const hasFilters = q.length > 0 || status !== ALL || classId !== ALL

  const searchInput = (
    <div className="relative flex-1">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, guardian, contact, or ID…"
        className="h-8 pl-9"
      />
    </div>
  )

  const statusSelect = (
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
  )

  return (
    <div className="space-y-4">
      {/* Class-scoped: search + status on one row (no class filter needed).
          Main list: search on its own row, status + class split below. */}
      {lockedClassId ? (
        <div className="flex items-center gap-2.5">
          {searchInput}
          <div className="w-36 shrink-0">{statusSelect}</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {searchInput}
          <div className="grid grid-cols-2 gap-2.5">
            {statusSelect}
            <Select value={classId} onValueChange={(v) => setClassId(v ?? ALL)}>
              <SelectTrigger className="w-full data-[size=default]:h-8">
                <SelectValue placeholder="Class">
                  {(v: string) =>
                    v === ALL
                      ? "All classes"
                      : (() => {
                          const c = classes?.find((c) => c.id === v)
                          return c ? formatClassName(c.name, c.section) : "Class"
                        })()
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classes ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatClassName(c.name, c.section)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Count — skipped when class-scoped (the class header already shows it). */}
      {!lockedClassId && !isLoading && total > 0 && (
        <p className="text-muted-foreground text-xs">
          {total} {total === 1 ? "student" : "students"}
        </p>
      )}

      {/* List — one dense row per student; the whole row links to the profile. */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] rounded-xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className={cn(isPlaceholder && "opacity-60")}>
          <div className="divide-y">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 px-3 py-2">
                <Link
                  href={`/students/${s.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                  onMouseEnter={() => prefetchProfile(s.id)}
                  onFocus={() => prefetchProfile(s.id)}
                >
                  <StudentAvatar photoUrl={s.photoUrl} seed={s.id} name={s.fullName} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium hover:underline">
                        {s.fullName}
                      </span>
                      {/* Only badge the exception (inactive); active is the norm. */}
                      {s.status !== "ACTIVE" && (
                        <StudentStatusBadge
                          status={s.status}
                          className="shrink-0 px-1.5 py-0 text-[10px]"
                        />
                      )}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      ID {s.serialNo}
                      {/* Class is redundant when the list is already scoped to one. */}
                      {!lockedClassId && s.className
                        ? ` · ${formatClassName(s.className, s.classSection)}`
                        : ""}
                      {s.guardianName ? ` · ${s.guardianName}` : ""}
                      {s.contactNumber ? ` · ${s.contactNumber}` : ""}
                    </div>
                  </div>
                </Link>
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
          title={lockedClassId ? "No students in this class" : "No students found"}
          description={
            lockedClassId
              ? "Assign students to this class from their profile."
              : hasFilters
                ? "Try adjusting your search or filters."
                : "Add your first student to get started."
          }
        />
      )}
    </div>
  )
}
