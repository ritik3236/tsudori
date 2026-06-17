"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Search, Wallet } from "lucide-react"

import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useClassOptions } from "@/features/students/hooks"
import { useStudentFees } from "@/features/fees/hooks"
import { FeeStatusBadge } from "@/features/fees/components/fee-status-badge"
import { RecordPaymentButton } from "@/features/fees/components/record-payment-button"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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

export function FeesTable({ canRecord }: { canRecord: boolean }) {
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [classId, setClassId] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  const { data: classes } = useClassOptions()

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isPlaceholderData } = useStudentFees({
    q: q || undefined,
    status:
      status === ALL ? undefined : (status as "PAID" | "PARTIAL" | "UNPAID" | "ADVANCE"),
    classId: classId === ALL ? undefined : classId,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const colSpan = canRecord ? 6 : 5

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, guardian, or ID…"
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
              { value: "UNPAID", label: "Unpaid" },
              { value: "PARTIAL", label: "Partial" },
              { value: "PAID", label: "Paid" },
              { value: "ADVANCE", label: "Advance" },
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

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Monthly fee</TableHead>
              <TableHead className="text-right">Paid (this month)</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              {canRecord && <TableHead className="w-32" />}
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
                <TableRow key={s.studentId}>
                  <TableCell>
                    <Link
                      href={`/fees/${s.studentId}`}
                      className="font-medium hover:underline"
                    >
                      {s.fullName}
                    </Link>
                    <div className="mt-0.5">
                      <FeeStatusBadge status={s.status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.className ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(s.monthlyFee)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(s.paidThisMonth)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {s.advance > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(s.advance)}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          s.pendingThisMonth > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatCurrency(s.pendingThisMonth)}
                      </span>
                    )}
                  </TableCell>
                  {canRecord && (
                    <TableCell className="text-right">
                      <RecordPaymentButton
                        studentId={s.studentId}
                        studentName={s.fullName}
                        monthlyFee={s.monthlyFee}
                        label="Record"
                        variant="outline"
                        size="sm"
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <FeesEmpty filtered={Boolean(q) || status !== ALL || classId !== ALL} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border p-3.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          ))
        ) : data && data.items.length > 0 ? (
          data.items.map((s) => (
            <div
              key={s.studentId}
              className={cn(
                "bg-card rounded-xl border p-3.5",
                isPlaceholderData && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/fees/${s.studentId}`}
                    className="font-medium hover:underline"
                  >
                    {s.fullName}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    ID {s.serialNo}
                    {s.className ? ` · ${s.className}` : ""}
                  </p>
                </div>
                <FeeStatusBadge status={s.status} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="text-xs">
                  {s.advance > 0 ? (
                    <>
                      <span className="text-muted-foreground">Advance </span>
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.advance)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Pending </span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          s.pendingThisMonth > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                        )}
                      >
                        {formatCurrency(s.pendingThisMonth)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        of {formatCurrency(s.monthlyFee)}
                      </span>
                    </>
                  )}
                </div>
                {canRecord && (
                  <RecordPaymentButton
                    studentId={s.studentId}
                    studentName={s.fullName}
                    monthlyFee={s.monthlyFee}
                    label="Record"
                    variant="outline"
                    size="sm"
                  />
                )}
              </div>
            </div>
          ))
        ) : (
          <FeesEmpty filtered={Boolean(q) || status !== ALL || classId !== ALL} />
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

function FeesEmpty({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      icon={Wallet}
      title="No students found"
      description={
        filtered
          ? "Try adjusting your search or filters."
          : "Add students to start tracking fees."
      }
      className="border-0"
    />
  )
}
