import { z } from "zod"

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants"

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const

export const METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  OTHER: "Other",
}

export const FEE_STATUSES = ["PAID", "PARTIAL", "UNPAID", "ADVANCE", "WAIVED"] as const

// ─── API / domain contract ────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  amount: z.coerce
    .number({ message: "Enter a valid amount." })
    .positive("Enter an amount greater than zero.")
    .max(10_000_000),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  paidAt: z.coerce.date({ message: "Enter a valid date." }),
  note: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

export const waiveFeeSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  amount: z.coerce
    .number({ message: "Enter a valid amount." })
    .positive("Enter an amount greater than zero.")
    .max(10_000_000),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  reason: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
})

export type WaiveFeeInput = z.infer<typeof waiveFeeSchema>

export const feeQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(FEE_STATUSES).optional(),
  classId: z.string().trim().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type FeeQuery = z.infer<typeof feeQuerySchema>

// ─── Client form model (all strings) ──────────────────────────────────────────

export const paymentFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((v) => Number(v) > 0, "Enter an amount greater than zero."),
  periodMonth: z.string().min(1),
  periodYear: z.string().min(1),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string().min(1, "Date is required."),
  note: z.string().trim().max(500),
})

export type PaymentFormValues = z.infer<typeof paymentFormSchema>

export function formValuesToInput(
  studentId: string,
  v: PaymentFormValues
): RecordPaymentInput {
  return {
    studentId,
    amount: Number(v.amount),
    periodMonth: Number(v.periodMonth),
    periodYear: Number(v.periodYear),
    method: v.method,
    paidAt: new Date(v.paidAt),
    note: v.note || null,
  }
}

// ─── Waiver form model ────────────────────────────────────────────────────────

export const waiverFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((v) => Number(v) > 0, "Enter an amount greater than zero."),
  reason: z.string().trim().max(500),
})

export type WaiverFormValues = z.infer<typeof waiverFormSchema>

export function waiverValuesToInput(
  studentId: string,
  periodMonth: number,
  periodYear: number,
  v: WaiverFormValues
): WaiveFeeInput {
  return {
    studentId,
    amount: Number(v.amount),
    periodMonth,
    periodYear,
    reason: v.reason || null,
  }
}
