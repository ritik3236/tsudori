"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { GraduationCap, Plus, Search } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { useCourses } from "@/features/course/hooks"
import { CourseRowActions } from "@/features/course/components/course-row-actions"
import { CreateCourseDialog } from "@/features/course/components/create-course-dialog"
import { BundleBadge } from "@/features/course/components/bundle-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type CoursesTableProps = {
  canManage: boolean
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
]

export function CoursesTable({ canManage }: CoursesTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const { data: courses, isLoading } = useCourses()

  const prefetch = (id: string) => router.prefetch(`/courses/${id}`)

  const filtered = (courses ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "ALL" || c.status === statusFilter)
  )

  const colSpan = canManage ? 6 : 5

  return (
    <div className="space-y-4">
      {/* Compact control row: search + status filter + create, all on one line. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "ALL")}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue>
              {(v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? "All status"}
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
        {canManage && (
          <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New course
          </Button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Monthly fee</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colSpan}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/courses/${c.id}`}
                        className="font-medium hover:underline"
                        onMouseEnter={() => prefetch(c.id)}
                        onFocus={() => prefetch(c.id)}
                      >
                        {c.name}
                      </Link>
                      {c.isBundle && <BundleBadge />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(c.monthlyFee)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {c.durationMonths} mo
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.enrollmentCount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={c.status === "ACTIVE"} />
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <CourseRowActions course={c} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <CoursesEmpty searched={Boolean(search) || statusFilter !== "ALL"} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-3.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((c) => (
            <div
              key={c.id}
              className="bg-card hover:bg-muted/40 relative rounded-xl border transition-colors"
            >
              <Link
                href={`/courses/${c.id}`}
                className="block p-3.5"
                onMouseEnter={() => prefetch(c.id)}
                onFocus={() => prefetch(c.id)}
              >
                <div className={canManage ? "pr-9" : undefined}>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.isBundle && <BundleBadge />}
                  </span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatCurrency(c.monthlyFee)}/mo
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {c.durationMonths} mo
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {c.enrollmentCount} enrolled
                    </span>
                    <StatusBadge active={c.status === "ACTIVE"} />
                  </div>
                </div>
              </Link>
              {canManage && (
                <div className="absolute top-2 right-2">
                  <CourseRowActions course={c} />
                </div>
              )}
            </div>
          ))
        ) : (
          <CoursesEmpty searched={Boolean(search) || statusFilter !== "ALL"} />
        )}
      </div>

      {canManage && <CreateCourseDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  )
}

function CoursesEmpty({ searched }: { searched: boolean }) {
  return (
    <EmptyState
      icon={GraduationCap}
      title="No courses found"
      description={
        searched ? "Try a different search or filter." : "Create your first course to get started."
      }
      className="border-0"
    />
  )
}
