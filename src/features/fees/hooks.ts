"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { feeKeys, feesApi, type FeeListParams } from "@/features/fees/api"
import type { RecordPaymentInput, WaiveFeeInput } from "@/features/fees/schema"

export { feeKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

export function useStudentFees(params: FeeListParams) {
  return useQuery({
    queryKey: feeKeys.list(params),
    queryFn: () => feesApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useStudentFee(id: string) {
  return useQuery({
    queryKey: feeKeys.detail(id),
    queryFn: () => feesApi.getStudent(id),
    enabled: Boolean(id),
  })
}

export function useFeeOverview(classId?: string) {
  return useQuery({
    queryKey: feeKeys.overview(classId ?? null),
    queryFn: () => feesApi.overview(classId),
    staleTime: 30_000,
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RecordPaymentInput) => feesApi.record(data),
    onSuccess: ({ payments, waivedAmount }) => {
      qc.invalidateQueries({ queryKey: feeKeys.all })
      const waived =
        waivedAmount > 0 ? ` · ₹${waivedAmount.toLocaleString("en-IN")} waived` : ""
      if (payments.length <= 1) {
        toast.success(`Payment recorded — receipt #${payments[0]?.receiptNo}${waived}.`)
      } else {
        const first = payments[0].receiptNo
        const lastNo = payments[payments.length - 1].receiptNo
        toast.success(
          `Payment recorded across ${payments.length} months — receipts #${first}–#${lastNo}${waived}.`
        )
      }
    },
    onError: (e) => reportError(e, "Couldn't record the payment."),
  })
}

export function useWaiveFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: WaiveFeeInput) => feesApi.waive(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.all })
      toast.success("Fee waived for this month.")
    },
    onError: (e) => reportError(e, "Couldn't waive the fee."),
  })
}
