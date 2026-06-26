import { http } from "@/lib/http"
import type { EnrollmentItem } from "@/features/enrollment/types"
import type {
  EnrollmentCreateInput,
  EnrollmentUpdateInput,
  OneTimeChargeInput,
} from "@/features/enrollment/schema"

export const enrollmentKeys = {
  all: ["enrollments"] as const,
  byStudent: (studentId: string) => [...enrollmentKeys.all, "student", studentId] as const,
}

export const enrollmentsApi = {
  listByStudent: (studentId: string) =>
    http.get<EnrollmentItem[]>(`/api/enrollments?studentId=${encodeURIComponent(studentId)}`),
  create: (data: EnrollmentCreateInput) =>
    http.post<EnrollmentItem>("/api/enrollments", data),
  update: (id: string, data: EnrollmentUpdateInput) =>
    http.patch<EnrollmentItem>(`/api/enrollments/${id}`, data),
  addOneTimeCharge: (id: string, data: OneTimeChargeInput) =>
    http.post<EnrollmentItem>(`/api/enrollments/${id}/charges`, data),
}
