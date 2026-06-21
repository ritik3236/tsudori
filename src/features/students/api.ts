import type { StudentStatus } from "@prisma/client"

import { buildQuery, http } from "@/lib/http"
import type {
  StudentDetail,
  StudentPage,
} from "@/features/students/types"
import type { ClassListItem } from "@/features/classes/types"
import type {
  StudentCreateInput,
  StudentUpdateInput,
} from "@/features/students/schema"

export type StudentListParams = {
  q?: string
  status?: StudentStatus
  classId?: string
  /** Show only archived (soft-deleted) students. */
  archived?: boolean
}

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const studentKeys = {
  all: ["students"] as const,
  lists: () => [...studentKeys.all, "list"] as const,
  list: (params: StudentListParams) => [...studentKeys.lists(), params] as const,
  details: () => [...studentKeys.all, "detail"] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
}

export const studentsApi = {
  list: (params: StudentListParams, offset = 0) =>
    http.get<StudentPage>(
      `/api/students${buildQuery({ ...params, offset: offset || undefined })}`
    ),
  get: (id: string) => http.get<StudentDetail>(`/api/students/${id}`),
  create: (data: StudentCreateInput) =>
    http.post<StudentDetail>("/api/students", data),
  update: (id: string, data: StudentUpdateInput) =>
    http.patch<StudentDetail>(`/api/students/${id}`, data),
  archive: (id: string, reason?: string) =>
    http.delete<void>(
      `/api/students/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`
    ),
}

export const classesApi = {
  list: () => http.get<ClassListItem[]>("/api/classes"),
}
