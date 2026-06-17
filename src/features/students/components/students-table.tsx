"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Phone, Search, Users } from "lucide-react"

import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import { useClassOptions, useStudents } from "@/features/students/hooks"
import { StudentRowActions } from "@/features/students/components/student-row-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "all"

type StudentsTableProps = {
  canEdit: boolean
  canArchive: boolean
}

export function StudentsTable({ canEdit, canArchive }: StudentsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [classId, setClassId] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  const { data: classes } = useClassOptions()

  // Warm the (server-rendered) profile route on intent, so the click feels instant.
  const prefetchProfile = (id: string) => router.prefetch(`/students/${id}`)

  // Debounce the search box; reset to page 1 whenever the query changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isPlaceholderData } = useStudents({
    q: q || undefined,
    status: status === ALL ? undefined : (status as "ACTIVE" | "INACTIVE"),
    classId: classId === ALL ? undefined : classId,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const showActions = canEdit || canArchive
  const colSpan = showActions ? 7 : 6

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, guardian, contact, or ID…"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:gap-2.5">
          <FilterSelect
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            placeholder="Status"
            options={[
              { value: ALL, label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
          <FilterSelect
            value={classId}
            onChange={(v) => {
              setClassId(v)
              setPage(1)
            }}
            placeholder="Class"
            options={[
              { value: ALL, label: "All classes" },
              ...(classes ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </div>

      {/* Desktop: dense table. Hidden on mobile where a horizontal scroll of 7
          columns would be unusable. */}
      <div className="hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Guardian</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Monthly Fee</TableHead>
              {showActions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody className={isPlaceholderData ? "opacity-60" : undefined}>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colSpan}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data && data.items.length > 0 ? (
              data.items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {s.serialNo}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/students/${s.id}`}
                      className="font-medium hover:underline"
                      onMouseEnter={() => prefetchProfile(s.id)}
                      onFocus={() => prefetchProfile(s.id)}
                    >
                      {s.fullName}
                    </Link>
                    <div className="mt-0.5">
                      <StatusBadge active={s.status === "ACTIVE"} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.className ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.guardianName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {s.contactNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(s.monthlyFee)}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <StudentRowActions
                        studentId={s.id}
                        studentName={s.fullName}
                        canEdit={canEdit}
                        canArchive={canArchive}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <EmptyState
                    icon={Users}
                    title="No students found"
                    description={
                      q || status !== ALL || classId !== ALL
                        ? "Try adjusting your search or filters."
                        : "Add your first student to get started."
                    }
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: a denser, fully tappable card per student. The whole info area is
          a link to the profile; the actions menu sits outside it to avoid nesting
          interactive elements. */}
      <div className="space-y-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border p-3.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>
          ))
        ) : data && data.items.length > 0 ? (
          data.items.map((s) => (
            <div
              key={s.id}
              className={cn(
                "bg-card relative rounded-xl border transition-colors hover:bg-muted/40",
                isPlaceholderData && "opacity-60"
              )}
            >
              <Link
                href={`/students/${s.id}`}
                className="block p-3.5"
                onMouseEnter={() => prefetchProfile(s.id)}
                onFocus={() => prefetchProfile(s.id)}
              >
                <div className="pr-9">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{s.fullName}</p>
                    <StatusBadge active={s.status === "ACTIVE"} />
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    ID {s.serialNo}
                    {s.className ? ` · ${s.className}` : ""}
                    {s.guardianName ? ` · ${s.guardianName}` : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-sm tabular-nums">
                      <Phone className="size-3.5 shrink-0" />
                      <span className="truncate">{s.contactNumber ?? "—"}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatCurrency(s.monthlyFee)}
                    </span>
                  </div>
                </div>
              </Link>
              {showActions && (
                <div className="absolute top-2 right-2">
                  <StudentRowActions
                    studentId={s.id}
                    studentName={s.fullName}
                    canEdit={canEdit}
                    canArchive={canArchive}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon={Users}
            title="No students found"
            description={
              q || status !== ALL || classId !== ALL
                ? "Try adjusting your search or filters."
                : "Add your first student to get started."
            }
          />
        )}
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {data.total} {data.total === 1 ? "student" : "students"} · page {data.page} of{" "}
            {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? ALL)}>
      <SelectTrigger className="w-full sm:w-44">
        <SelectValue placeholder={placeholder}>
          {(v: string) => options.find((o) => o.value === v)?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
