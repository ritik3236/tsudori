import { buildQuery, http } from "@/lib/http"
import type {
  Paginated,
  StudentDetail,
  StudentListItem,
} from "@/features/students/types"
import type { ClassListItem } from "@/features/classes/types"
import type {
  StudentCreateInput,
  StudentUpdateInput,
} from "@/features/students/schema"

export type StudentListParams = {
  q?: string
  status?: "ACTIVE" | "INACTIVE"
  classId?: string
  includeArchived?: boolean
  page?: number
  pageSize?: number
}

export const studentsApi = {
  list: (params: StudentListParams) =>
    http.get<Paginated<StudentListItem>>(`/api/students${buildQuery(params)}`),
  get: (id: string) => http.get<StudentDetail>(`/api/students/${id}`),
  create: (data: StudentCreateInput) =>
    http.post<StudentDetail>("/api/students", data),
  update: (id: string, data: StudentUpdateInput) =>
    http.patch<StudentDetail>(`/api/students/${id}`, data),
  archive: (id: string) => http.delete<void>(`/api/students/${id}`),
}

export const classesApi = {
  list: () => http.get<ClassListItem[]>("/api/classes"),
}
