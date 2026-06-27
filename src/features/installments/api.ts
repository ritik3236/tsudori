import { http } from "@/lib/http"
import type { InstallmentPlan } from "@/features/installments/types"

// What the client POSTs — dueDate is a "YYYY-MM-DD" string (the server parses it
// IST→UTC). `id` is present for rows that already exist.
export type SavePlanRow = { id?: string; dueDate: string; amount: number; label?: string | null }
export type SavePlanPayload = { studentId: string; rows: SavePlanRow[] }

export const installmentKeys = {
  all: ["installments"] as const,
  byStudent: (studentId: string) => [...installmentKeys.all, "student", studentId] as const,
}

export const installmentsApi = {
  getByStudent: (studentId: string) =>
    http.get<InstallmentPlan>(`/api/installments?studentId=${encodeURIComponent(studentId)}`),
  save: (payload: SavePlanPayload) => http.post<InstallmentPlan>("/api/installments", payload),
  switchToMonthly: (studentId: string) =>
    http.post<InstallmentPlan>("/api/installments/monthly", { studentId }),
}
