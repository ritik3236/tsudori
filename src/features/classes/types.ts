import type { ClassStatus } from "@prisma/client"

export type ClassListItem = {
  id: string
  name: string
  section: string | null
  defaultMonthlyFee: number
  status: ClassStatus
  studentCount: number
}
