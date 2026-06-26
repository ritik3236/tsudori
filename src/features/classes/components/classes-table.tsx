"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, School } from "lucide-react"
import { useState } from "react"

import { formatCurrency } from "@/lib/format"
import { useClasses } from "@/features/classes/hooks"
import { ClassRowActions } from "@/features/classes/components/class-row-actions"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ClassesTableProps = {
  canManage: boolean
}

export function ClassesTable({ canManage }: ClassesTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const { data: classes, isLoading } = useClasses()

  // Warm the (server-rendered) class detail route on intent.
  const prefetchClass = (id: string) => router.prefetch(`/classes/${id}`)

  const filtered = classes
    ? classes.filter((c) =>
        `${c.name} ${c.section ?? ""}`.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const colSpan = canManage ? 5 : 4

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search classes…"
          className="h-8 pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Monthly fee</TableHead>
              <TableHead className="text-right">Students</TableHead>
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
              filtered.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>
                    <Link
                      href={`/classes/${cls.id}`}
                      className="font-medium hover:underline"
                      onMouseEnter={() => prefetchClass(cls.id)}
                      onFocus={() => prefetchClass(cls.id)}
                    >
                      {cls.name}
                    </Link>
                    {cls.section && (
                      <Badge variant="secondary" className="ml-2">
                        {cls.section}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {cls.courseMonthlyFee != null ? (
                      formatCurrency(cls.courseMonthlyFee)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {cls.studentCount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={cls.status === "ACTIVE"} />
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <ClassRowActions cls={cls} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <ClassesEmpty searched={Boolean(search)} />
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
          filtered.map((cls) => (
            <div key={cls.id} className="bg-card relative rounded-xl border transition-colors hover:bg-muted/40">
              <Link
                href={`/classes/${cls.id}`}
                className="block p-3.5"
                onMouseEnter={() => prefetchClass(cls.id)}
                onFocus={() => prefetchClass(cls.id)}
              >
                <div className={canManage ? "pr-9" : undefined}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{cls.name}</span>
                    {cls.section && (
                      <Badge variant="secondary" className="text-xs">
                        {cls.section}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {cls.courseMonthlyFee != null
                        ? `${formatCurrency(cls.courseMonthlyFee)}/mo`
                        : "No course"}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {cls.studentCount} student{cls.studentCount !== 1 ? "s" : ""}
                    </span>
                    <StatusBadge active={cls.status === "ACTIVE"} />
                  </div>
                </div>
              </Link>
              {canManage && (
                <div className="absolute top-2 right-2">
                  <ClassRowActions cls={cls} />
                </div>
              )}
            </div>
          ))
        ) : (
          <ClassesEmpty searched={Boolean(search)} />
        )}
      </div>
    </div>
  )
}

function ClassesEmpty({ searched }: { searched: boolean }) {
  return (
    <EmptyState
      icon={School}
      title="No classes found"
      description={
        searched ? "Try a different search term." : "Create your first class to get started."
      }
      className="border-0"
    />
  )
}
