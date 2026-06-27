"use client"

import { useState } from "react"
import { GraduationCap, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import type { EnrollmentStatus } from "@prisma/client"
import { useEnrollments } from "@/features/enrollment/hooks"
import { ENROLLMENT_STATUS_LABEL } from "@/features/enrollment/schema"
import { EnrollDialog } from "@/features/enrollment/components/enroll-dialog"
import { EnrollmentRowActions } from "@/features/enrollment/components/enrollment-row-actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"

const STATUS_TONE: Record<EnrollmentStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

function StatusChip({ status }: { status: EnrollmentStatus }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 align-middle text-[10px] font-medium",
        STATUS_TONE[status]
      )}
    >
      {ENROLLMENT_STATUS_LABEL[status]}
    </span>
  )
}

type Props = {
  studentId: string
  canManage: boolean
  /** Forwarded to the add-course dialog so it can warn that an installment plan's
   *  fee isn't auto-billed per course. */
  isInstallment?: boolean
}

export function EnrollmentsPanel({ studentId, canManage, isInstallment }: Props) {
  const { data: enrollments, isLoading } = useEnrollments(studentId)
  const [enrollOpen, setEnrollOpen] = useState(false)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium">Course enrolments</h2>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)}>
            <Plus className="size-4" /> Add course
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-card space-y-2 rounded-xl border p-3.5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : !enrollments?.length ? (
        <EmptyState
          icon={GraduationCap}
          title="No course enrolments"
          description={
            canManage
              ? "Add a course to start billing this student against the fee ledger."
              : "This student isn't enrolled in any course yet."
          }
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          <ul className="divide-y">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{e.courseName}</span>
                    <StatusChip status={e.status} />
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                    {formatCurrency(e.effectiveFee)}/mo
                    {e.discountPercent != null
                      ? ` · ${e.discountPercent}% off`
                      : e.feeOverride != null && e.feeOverride !== e.courseMonthlyFee
                        ? " · custom rate"
                        : ""}
                    {" · "}
                    {formatCurrency(e.paid)} of {formatCurrency(e.charged)} paid
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      e.outstanding > 0 && "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {formatCurrency(e.outstanding)}
                  </p>
                  <p className="text-muted-foreground text-[11px]">outstanding</p>
                </div>
                {canManage && <EnrollmentRowActions enrollment={e} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <EnrollDialog
          studentId={studentId}
          open={enrollOpen}
          onOpenChange={setEnrollOpen}
          isInstallment={isInstallment}
        />
      )}
    </div>
  )
}
