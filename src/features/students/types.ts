import type { StudentStatus } from "@prisma/client"

// Wire DTOs. Prisma Decimal/Date are normalised to number/ISO-string here so the
// shapes are JSON-safe and identical on both sides of the API.

export type StudentListItem = {
  id: string
  serialNo: number
  rollNumber: string | null
  fullName: string
  className: string | null
  classId: string | null
  guardianName: string | null
  contactNumber: string | null
  monthlyFee: number
  status: StudentStatus
  admissionDate: string
}

export type StudentDetail = StudentListItem & {
  email: string | null
  notes: string | null
  archivedAt: string | null
  createdAt: string
  fees: {
    monthlyFee: number
    totalPaid: number
    paymentsCount: number
  }
  attendance: {
    present: number
    absent: number
    leave: number
  }
  recentPayments: {
    id: string
    amount: number
    paidAt: string
    receiptNo: number
    method: string
  }[]
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
