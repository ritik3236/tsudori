import type { ClassStatus } from "@prisma/client"

export type ClassListItem = {
  id: string
  name: string
  section: string
  /** The course this batch runs — the single source of its monthly fee — or null. */
  courseId: string | null
  courseName: string | null
  /** The assigned course's monthly fee (the class's fee), or null when no course. */
  courseMonthlyFee: number | null
  status: ClassStatus
  studentCount: number
  /** Per-class weekly-off (Luxon weekdays), or null when it inherits the institute. */
  weeklyOffOverride: number[] | null
}
