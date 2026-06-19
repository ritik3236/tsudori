import { buildQuery, http } from "@/lib/http"
import type { Paginated } from "@/features/students/types"
import type {
  FeeMonthlyOverview,
  FeeStatus,
  PaymentItem,
  StudentFeeDetail,
  StudentFeeListItem,
  WaiverItem,
} from "@/features/fees/types"
import type {
  RecordPaymentInput,
  ReverseFeeInput,
  WaiveFeeInput,
} from "@/features/fees/schema"

export type FeeListParams = {
  q?: string
  status?: FeeStatus
  classId?: string
  periodMonth?: number
  periodYear?: number
  page?: number
  pageSize?: number
}

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const feeKeys = {
  all: ["fees"] as const,
  lists: () => [...feeKeys.all, "list"] as const,
  list: (params: FeeListParams) => [...feeKeys.lists(), params] as const,
  details: () => [...feeKeys.all, "detail"] as const,
  detail: (id: string) => [...feeKeys.details(), id] as const,
  overview: (classId: string | null) => [...feeKeys.all, "overview", classId] as const,
}

export const feesApi = {
  list: (params: FeeListParams) =>
    http.get<Paginated<StudentFeeListItem>>(`/api/fees${buildQuery(params)}`),
  getStudent: (studentId: string) =>
    http.get<StudentFeeDetail>(`/api/fees/${studentId}`),
  overview: (classId?: string) =>
    http.get<FeeMonthlyOverview>(`/api/fees/overview${buildQuery({ classId })}`),
  record: (data: RecordPaymentInput) =>
    http.post<{ payments: PaymentItem[]; waivedAmount: number }>("/api/fees", data),
  waive: (data: WaiveFeeInput) =>
    http.post<{ waivers: WaiverItem[]; total: number }>("/api/fees/waiver", data),
  reverse: (data: ReverseFeeInput) =>
    http.post<{ reversal: PaymentItem; original: PaymentItem }>(
      "/api/fees/reverse",
      data
    ),
}
