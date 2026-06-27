import type { BillingMode } from "@prisma/client"

export type InstallmentStatus = "PAID" | "PARTIAL" | "DUE" | "OVERDUE" | "UPCOMING"

export type InstallmentPlanItem = {
  id: string
  /** 1-based display ordinal, by due date. */
  seq: number
  dueDate: string
  amount: number
  label: string | null
  paid: number
  waived: number
  outstanding: number
  /** Has a settlement (payment/waiver) → read-only; edit needs a reversal first. */
  locked: boolean
  status: InstallmentStatus
}

export type InstallmentPlan = {
  studentId: string
  billingMode: BillingMode
  items: InstallmentPlanItem[]
  total: number
}
