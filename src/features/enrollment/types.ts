import type { EnrollmentStatus } from "@prisma/client"

// Wire DTO for an enrolment + its ledger roll-up (Decimal/Date normalised to
// number/ISO-string). `outstanding` is capped per charge (an overpaid/prepaid
// charge can't cancel another's shortfall), matching the legacy month-walk.
export type EnrollmentItem = {
  id: string
  studentId: string
  courseId: string
  courseName: string
  startDate: string
  /** A fixed rate for this enrolment; null when not a fixed override. */
  feeOverride: number | null
  /** Percent off the course fee (0–100); the alternative scholarship form. */
  discountPercent: number | null
  /** The rate that actually bills (fixed override / % off / course rate). */
  effectiveFee: number
  /** The course's catalog rate — to tell a real override from one that just matches. */
  courseMonthlyFee: number
  status: EnrollmentStatus
  /** Ledger roll-up. */
  charged: number
  paid: number
  waived: number
  outstanding: number
}
