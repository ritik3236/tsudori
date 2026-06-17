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
import type { RecordPaymentInput, WaiveFeeInput } from "@/features/fees/schema"

export type FeeListParams = {
  q?: string
  status?: FeeStatus
  classId?: string
  periodMonth?: number
  periodYear?: number
  page?: number
  pageSize?: number
}

export const feesApi = {
  list: (params: FeeListParams) =>
    http.get<Paginated<StudentFeeListItem>>(`/api/fees${buildQuery(params)}`),
  getStudent: (studentId: string) =>
    http.get<StudentFeeDetail>(`/api/fees/${studentId}`),
  overview: (classId?: string) =>
    http.get<FeeMonthlyOverview>(`/api/fees/overview${buildQuery({ classId })}`),
  record: (data: RecordPaymentInput) => http.post<PaymentItem[]>("/api/fees", data),
  waive: (data: WaiveFeeInput) => http.post<WaiverItem>("/api/fees/waiver", data),
}
