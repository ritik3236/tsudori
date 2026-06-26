import type { ClassStatus } from "@prisma/client"

export type ClassListItem = {
  id: string
  name: string
  section: string
  defaultMonthlyFee: number
  /** The course this batch runs (drives fees via enrolments), or null. */
  courseId: string | null
  courseName: string | null
  status: ClassStatus
  studentCount: number
  /** Per-class weekly-off (Luxon weekdays), or null when it inherits the institute. */
  weeklyOffOverride: number[] | null
}
