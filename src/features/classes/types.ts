import type { ClassStatus } from "@prisma/client"

export type ClassListItem = {
  id: string
  name: string
  section: string
  defaultMonthlyFee: number
  status: ClassStatus
  studentCount: number
  /** Per-class weekly-off (Luxon weekdays), or null when it inherits the institute. */
  weeklyOffOverride: number[] | null
}
