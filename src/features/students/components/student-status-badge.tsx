import type { StudentStatus } from "@prisma/client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// One source of truth for the student lifecycle label + badge tone. Kept separate
// from the binary class/member StatusBadge (which is just Active/Inactive).
export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  LEFT: "Left",
  COMPLETED: "Completed",
}

const STATUS_TONE: Record<StudentStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  ON_HOLD: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  LEFT: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  COMPLETED: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
}

export function StudentStatusBadge({
  status,
  className,
}: {
  status: StudentStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", STATUS_TONE[status], className)}
    >
      {STUDENT_STATUS_LABEL[status]}
    </Badge>
  )
}
