"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { EditClassDialog } from "@/features/classes/components/edit-class-dialog"
import { ClassAttendanceConfig } from "@/features/attendance/components/class-attendance-config"
import { StudentsTable } from "@/features/students/components/students-table"
import type { ClassListItem } from "@/features/classes/types"

type ClassDetailProps = {
  cls: ClassListItem
  canManage: boolean
}

export function ClassDetail({ cls, canManage }: ClassDetailProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            {cls.section && <Badge variant="secondary">{cls.section}</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Default fee: <span className="font-medium text-foreground">{formatCurrency(cls.defaultMonthlyFee)}/mo</span></span>
            <span>{cls.studentCount} student{cls.studentCount !== 1 ? "s" : ""}</span>
            <StatusBadge active={cls.status === "ACTIVE"} />
          </div>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        )}
      </div>

      {/* Students — same list as the main Students page, scoped to this class. */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Enrolled students</h2>
        <StudentsTable classId={cls.id} />
      </div>

      {canManage && <ClassAttendanceConfig cls={cls} />}

      {canManage && (
        <EditClassDialog cls={cls} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  )
}
