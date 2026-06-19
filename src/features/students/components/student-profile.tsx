import {
  CalendarCheck,
  CalendarX,
  CalendarMinus,
  Receipt,
} from "lucide-react"

import { formatCurrency, formatDateLong, getInitials } from "@/lib/format"
import type { StudentDetail } from "@/features/students/types"
import { StudentProfileActions } from "@/features/students/components/student-profile-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"

type StudentProfileProps = {
  student: StudentDetail
  canViewFees: boolean
  canEdit: boolean
  canArchive: boolean
}

export function StudentProfile({
  student,
  canViewFees,
  canEdit,
  canArchive,
}: StudentProfileProps) {
  const isArchived = student.archivedAt !== null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg">
              {getInitials(student.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {student.fullName}
              </h1>
              <StatusBadge active={student.status === "ACTIVE"} />
              {isArchived && <Badge variant="secondary">Archived</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">
              ID {student.serialNo}
              {student.className ? ` · ${student.className}` : ""}
            </p>
          </div>
        </div>
        <StudentProfileActions
          studentId={student.id}
          studentName={student.fullName}
          canViewFees={canViewFees}
          canEdit={canEdit}
          canArchive={canArchive}
          isArchived={isArchived}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Roll number" value={student.rollNumber} />
              <Detail label="Class" value={student.className} />
              <Detail label="Parent / Guardian" value={student.guardianName} />
              <Detail label="Contact number" value={student.contactNumber} />
              <Detail label="Email" value={student.email} />
              <Detail label="Admission date" value={formatDateLong(student.admissionDate)} />
              {student.notes && (
                <div className="sm:col-span-2">
                  <Detail label="Notes" value={student.notes} />
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fees &amp; attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Stat label="Monthly fee" value={formatCurrency(student.fees.monthlyFee)} />
              {student.fees.totalPaid !== null && (
                <Stat label="Total paid" value={formatCurrency(student.fees.totalPaid)} />
              )}
              {student.fees.paymentsCount !== null && (
                <Stat label="Payments" value={String(student.fees.paymentsCount)} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
              <AttStat icon={CalendarCheck} label="Present" value={student.attendance.present} tone="text-emerald-600 dark:text-emerald-400" />
              <AttStat icon={CalendarX} label="Absent" value={student.attendance.absent} tone="text-destructive" />
              <AttStat icon={CalendarMinus} label="Leave" value={student.attendance.leave} tone="text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Only rendered for viewers with fee:read; null otherwise (never fetched). */}
      {student.recentPayments && (
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {student.recentPayments.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No payments recorded"
                className="border-0 py-8"
              />
            ) : (
              <ul className="divide-y">
                {student.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                      <p className="text-muted-foreground text-xs">
                        Receipt #{p.receiptNo} · {formatDateLong(p.paidAt)} · {p.method}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function AttStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CalendarCheck
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="space-y-1">
      <Icon className={`mx-auto size-5 ${tone}`} />
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  )
}
