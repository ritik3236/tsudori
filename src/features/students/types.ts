import type { BillingMode, StudentStatus } from "@prisma/client"

// Wire DTOs. Prisma Decimal/Date are normalised to number/ISO-string here so the
// shapes are JSON-safe and identical on both sides of the API.

export type StudentListItem = {
  id: string
  serialNo: number
  rollNumber: string | null
  fullName: string
  className: string | null
  classSection: string | null
  classId: string | null
  guardianName: string | null
  contactNumber: string | null
  /** MONTHLY → show monthlyFee; INSTALLMENT → show an "Installments" label (no /mo). */
  billingMode: BillingMode
  monthlyFee: number
  status: StudentStatus
  admissionDate: string
  /** Profile photo (Blob URL), or null to show initials. */
  photoUrl: string | null
}

export type StudentDetail = StudentListItem & {
  email: string | null
  notes: string | null
  archivedAt: string | null
  createdAt: string
  fees: {
    // The fee rate is a student attribute (also shown in lists). The collected
    // figures below are null when the viewer lacks fee:read — never fetched.
    monthlyFee: number
    totalPaid: number | null
    paymentsCount: number | null
  }
  attendance: {
    present: number
    absent: number
    leave: number
  }
  // null (not just empty) when the viewer lacks fee:read.
  recentPayments:
    | {
        id: string
        amount: number
        paidAt: string
        receiptNo: number
        method: string
      }[]
    | null
}

/** Offset-paged slice for the infinite-scroll student list (mirrors StudentFeePage). */
export type StudentPage = {
  items: StudentListItem[]
  nextOffset: number | null
  total: number
}
