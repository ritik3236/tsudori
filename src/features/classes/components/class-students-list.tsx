"use client"

import Link from "next/link"
import { Users, Phone } from "lucide-react"

import { MAX_PAGE_SIZE } from "@/lib/constants"
import { formatCurrency } from "@/lib/format"
import { useStudents } from "@/features/students/hooks"
import { StudentRowActions } from "@/features/students/components/student-row-actions"
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

type ClassStudentsListProps = {
  classId: string
  canEdit?: boolean
  canArchive?: boolean
}

export function ClassStudentsList({
  classId,
  canEdit = false,
  canArchive = false,
}: ClassStudentsListProps) {
  const { data, isLoading } = useStudents({ classId, pageSize: MAX_PAGE_SIZE })
  const showActions = canEdit || canArchive
  const colSpan = showActions ? 5 : 4

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Enrolled students</h2>

      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Monthly Fee</TableHead>
              {showActions && <TableHead className="w-12" />}
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
            ) : data && data.items.length > 0 ? (
              data.items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {s.serialNo}
                  </TableCell>
                  <TableCell>
                    <Link href={`/students/${s.id}`} className="font-medium hover:underline">
                      {s.fullName}
                    </Link>
                    <div className="mt-0.5">
                      <StatusBadge active={s.status === "ACTIVE"} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {s.contactNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
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
                    title="No students in this class"
                    description="Assign students to this class from their profile."
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="space-y-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-3.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))
        ) : data && data.items.length > 0 ? (
          data.items.map((s) => (
            <div key={s.id} className="bg-card relative rounded-xl border transition-colors hover:bg-muted/40">
              <Link href={`/students/${s.id}`} className="block p-3.5">
                <div className={showActions ? "pr-9" : undefined}>
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{s.fullName}</p>
                    <StatusBadge active={s.status === "ACTIVE"} />
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">ID {s.serialNo}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm tabular-nums">
                      <Phone className="size-3.5 shrink-0" />
                      {s.contactNumber ?? "—"}
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
            title="No students in this class"
            description="Assign students to this class from their profile."
          />
        )}
      </div>
    </div>
  )
}
