"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { enrollmentKeys, enrollmentsApi } from "@/features/enrollment/api"
import type {
  EnrollmentCreateInput,
  EnrollmentUpdateInput,
  OneTimeChargeInput,
} from "@/features/enrollment/schema"

export { enrollmentKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

// Mutating an enrolment changes the fee ledger, so invalidate the fee + student
// caches alongside the enrolment list.
function useInvalidateLedger() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: enrollmentKeys.all })
    qc.invalidateQueries({ queryKey: ["fees"] })
    qc.invalidateQueries({ queryKey: ["students"] })
  }
}

export function useEnrollments(studentId: string) {
  return useQuery({
    queryKey: enrollmentKeys.byStudent(studentId),
    queryFn: () => enrollmentsApi.listByStudent(studentId),
    staleTime: 30_000,
  })
}

export function useCreateEnrollment() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: (data: EnrollmentCreateInput) => enrollmentsApi.create(data),
    onSuccess: (e) => {
      invalidate()
      toast.success(`Enrolled in ${e.courseName}.`)
    },
    onError: (e) => reportError(e, "Couldn't create the enrolment."),
  })
}

export function useUpdateEnrollment(id: string) {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: (data: EnrollmentUpdateInput) => enrollmentsApi.update(id, data),
    onSuccess: () => {
      invalidate()
      toast.success("Changes saved.")
    },
    onError: (e) => reportError(e, "Couldn't save changes."),
  })
}

export function useAddOneTimeCharge(id: string) {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: (data: OneTimeChargeInput) => enrollmentsApi.addOneTimeCharge(id, data),
    onSuccess: () => {
      invalidate()
      toast.success("One-time fee added.")
    },
    onError: (e) => reportError(e, "Couldn't add the fee."),
  })
}
