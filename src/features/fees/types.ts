import type { PaymentMethod } from "@prisma/client"

// Wire DTOs — Prisma Decimal/Date normalised to number/ISO-string, JSON-safe.

export type FeeStatus = "PAID" | "PARTIAL" | "UNPAID" | "ADVANCE" | "WAIVED"

export type StudentFeeListItem = {
  studentId: string
  serialNo: number
  fullName: string
  className: string | null
  classSection: string | null
  monthlyFee: number
  /** Paid towards the current fee month. */
  paidThisMonth: number
  /** Concession applied to this month — reduces the due, not counted as cash. */
  waivedThisMonth: number
  pendingThisMonth: number
  /** Credit in hand: overpayment of this month + payments for future months. */
  advance: number
  status: FeeStatus
  /** Parent/guardian phone — for the WhatsApp reminder/confirmation link. */
  contactNumber: string | null
  /** Latest receipt for this month (paid rows only) — powers the WhatsApp
   *  "fee received" confirmation so Amount/Receipt No/Date stay consistent. */
  lastReceipt: { receiptNo: number; amount: number; paidAt: string } | null
}

/** One infinite-scroll page of the fee list (offset-paged). */
export type StudentFeePage = {
  items: StudentFeeListItem[]
  nextOffset: number | null
  total: number
}

export type PaymentItem = {
  id: string
  amount: number
  periodMonth: number | null
  periodYear: number | null
  method: PaymentMethod
  paidAt: string
  /** NULL for reversal rows — they aren't receipts. */
  receiptNo: number | null
  note: string | null
  recordedBy: string | null
  /** Set when this row reverses another payment (negative amount). */
  reversalOfId: string | null
  /** For an original payment: how much of it has been reversed (0 if none). */
  reversedAmount: number
}

export type WaiverItem = {
  id: string
  amount: number
  periodMonth: number
  periodYear: number
  reason: string | null
  createdAt: string
  waivedBy: string | null
  /** Set when this row reverses another waiver (negative amount). */
  reversalOfId: string | null
  /** For an original waiver: how much of it has been reversed (0 if none). */
  reversedAmount: number
}

export type StudentFeeDetail = {
  studentId: string
  serialNo: number
  fullName: string
  className: string | null
  classSection: string | null
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
  /** Enough to run the allocator client-side for a "where will this land" preview:
   *  admission month (IST) + what's already paid/waived per `${year}-${month}`. */
  admission: { year: number; month: number }
  paidByMonth: Record<string, number>
  waivedByMonth: Record<string, number>
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
  /** Total concession applied across the month (for the "Settled" subtotal). */
  waivedThisMonth: number
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
  student: {
    fullName: string
    serialNo: number
    className: string | null
    classSection: string | null
    /** Parent/guardian phone — used for the WhatsApp receipt link. */
    contactNumber: string | null
  }
  institute: {
    name: string
    addressLine: string | null
    city: string | null
    phone: string | null
    email: string | null
  }
}
