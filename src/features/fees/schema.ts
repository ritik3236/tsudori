import { z } from "zod"

import { appDateToUtc } from "@/lib/date-helper"

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
  // Optional anchor for the fee=0 safety net only; allocation is always
  // oldest-first, so the UI no longer asks for a month. Defaults to now.
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  paidAt: z.coerce.date({ message: "Enter a valid date." }),
  note: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
  // When set, after the cash is applied the server waives every month still owing
  // so the student is fully settled — a combined pay-and-clear. The exact waiver
  // amount is computed server-side from the live ledger.
  waiveRemaining: z.boolean().optional().default(false),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

export const waiveFeeSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  // The total concession; the server clears outstanding months oldest-first.
  amount: z.coerce
    .number({ message: "Enter a valid amount." })
    .positive("Enter an amount greater than zero.")
    .max(10_000_000),
  reason: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
})

export type WaiveFeeInput = z.infer<typeof waiveFeeSchema>

export const reverseFeeSchema = z.object({
  paymentId: z.string().min(1, "Payment is required."),
  // Omitted → reverse the full remaining amount; otherwise a partial reversal.
  amount: z.coerce
    .number({ message: "Enter a valid amount." })
    .positive("Enter an amount greater than zero.")
    .max(10_000_000)
    .optional(),
  reason: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
})

export type ReverseFeeInput = z.infer<typeof reverseFeeSchema>

// Fee list pages this many students at a time (infinite scroll).
export const FEE_PAGE_SIZE = 30

export const feeQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(FEE_STATUSES).optional(),
  classId: z.string().trim().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
  offset: z.coerce.number().int().min(0).default(0),
})

// Summary aggregates are class-scoped but not affected by text search, so they
// take only the month + class — never `q` or `offset`.
export const feeSummaryQuerySchema = z.object({
  classId: z.string().trim().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2000).max(2100).optional(),
})

export type FeeQuery = z.infer<typeof feeQuerySchema>

// ─── Client form model (all strings) ──────────────────────────────────────────

export const paymentFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((v) => Number(v) > 0, "Enter an amount greater than zero."),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string().min(1, "Date is required."),
  note: z.string().trim().max(500),
  waiveRemaining: z.boolean(),
})

export type PaymentFormValues = z.infer<typeof paymentFormSchema>

export function formValuesToInput(
  studentId: string,
  v: PaymentFormValues
): RecordPaymentInput {
  return {
    studentId,
    amount: Number(v.amount),
    method: v.method,
    paidAt: appDateToUtc(v.paidAt),
    note: v.note || null,
    waiveRemaining: v.waiveRemaining,
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
  v: WaiverFormValues
): WaiveFeeInput {
  return {
    studentId,
    amount: Number(v.amount),
    reason: v.reason || null,
  }
}

// ─── Reversal form model ──────────────────────────────────────────────────────

export const reversalFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((v) => Number(v) > 0, "Enter an amount greater than zero."),
  reason: z.string().trim().max(500),
})

export type ReversalFormValues = z.infer<typeof reversalFormSchema>

export function reversalValuesToInput(
  paymentId: string,
  v: ReversalFormValues
): ReverseFeeInput {
  return {
    paymentId,
    amount: Number(v.amount),
    reason: v.reason || null,
  }
}
