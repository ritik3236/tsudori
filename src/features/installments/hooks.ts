"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { installmentKeys, installmentsApi, type SavePlanPayload } from "@/features/installments/api"

export { installmentKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

// Editing a plan mints/voids INSTALLMENT charges, so refresh the fee + student
// caches alongside the plan itself.
function useInvalidatePlan() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: installmentKeys.all })
    qc.invalidateQueries({ queryKey: ["fees"] })
    qc.invalidateQueries({ queryKey: ["students"] })
    qc.invalidateQueries({ queryKey: ["enrollments"] })
  }
}

export function useInstallmentPlan(studentId: string) {
  return useQuery({
    queryKey: installmentKeys.byStudent(studentId),
    queryFn: () => installmentsApi.getByStudent(studentId),
    staleTime: 30_000,
  })
}

export function useSaveInstallmentPlan() {
  const invalidate = useInvalidatePlan()
  return useMutation({
    mutationFn: (payload: SavePlanPayload) => installmentsApi.save(payload),
    onSuccess: () => {
      invalidate()
      toast.success("Installment plan saved.")
    },
    onError: (e) => reportError(e, "Couldn't save the plan."),
  })
}

export function useSwitchToMonthly() {
  const invalidate = useInvalidatePlan()
  return useMutation({
    mutationFn: (studentId: string) => installmentsApi.switchToMonthly(studentId),
    onSuccess: () => {
      invalidate()
      toast.success("Switched to monthly billing.")
    },
    onError: (e) => reportError(e, "Couldn't switch billing."),
  })
}
