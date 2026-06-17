import type { PaymentMethod } from "@prisma/client"

// Wire DTOs — Prisma Decimal/Date normalised to number/ISO-string, JSON-safe.

export type FeeStatus = "PAID" | "PARTIAL" | "UNPAID" | "ADVANCE" | "WAIVED"

export type StudentFeeListItem = {
  studentId: string
  serialNo: number
  fullName: string
  className: string | null
  monthlyFee: number
  /** Paid towards the current fee month. */
  paidThisMonth: number
  /** Concession applied to this month — reduces the due, not counted as cash. */
  waivedThisMonth: number
  pendingThisMonth: number
  /** Credit in hand: overpayment of this month + payments for future months. */
  advance: number
  status: FeeStatus
}

export type PaymentItem = {
  id: string
  amount: number
  periodMonth: number | null
  periodYear: number | null
  method: PaymentMethod
  paidAt: string
  receiptNo: number
  note: string | null
  recordedBy: string | null
}

export type WaiverItem = {
  id: string
  amount: number
  periodMonth: number
  periodYear: number
  reason: string | null
  createdAt: string
  waivedBy: string | null
}

export type StudentFeeDetail = {
  studentId: string
  serialNo: number
  fullName: string
  className: string | null
  guardianName: string | null
  contactNumber: string | null
  monthlyFee: number
  /** Lifetime total across all periods. */
  totalPaid: number
  /** Lifetime total waived across all periods. */
  totalWaived: number
  paidThisMonth: number
  waivedThisMonth: number
  pendingThisMonth: number
  /** Lifetime dues still owed: each billable month (admission→now), capped so a
   *  prepaid/overpaid month never offsets another month's due. */
  totalOutstanding: number
  /** Credit in hand: overpayment of this month + payments for future months. */
  advance: number
  status: FeeStatus
  payments: PaymentItem[]
  waivers: WaiverItem[]
}

export type FeeMonthlyOverview = {
  /** Per period ("YYYY-M", 1-based month): dues covered and dues expected.
   *  Expected is admission-aware — only students enrolled by that month count. */
  byMonth: Record<string, { collected: number; expected: number }>
}

export type FeeSummary = {
  collectedThisMonth: number
  expectedThisMonth: number
  pendingThisMonth: number
  paidCount: number
  pendingCount: number
  totalStudents: number
}

export type ReceiptData = {
  receiptNo: number
  amount: number
  periodMonth: number | null
  periodYear: number | null
  method: PaymentMethod
  paidAt: string
  note: string | null
  recordedBy: string | null
  student: { fullName: string; serialNo: number; className: string | null }
  institute: {
    name: string
    addressLine: string | null
    city: string | null
    phone: string | null
    email: string | null
  }
}
