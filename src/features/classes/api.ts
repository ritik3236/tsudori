import { http } from "@/lib/http"
import type { ClassListItem } from "@/features/classes/types"
import type { ClassCreateInput, ClassUpdateInput } from "@/features/classes/schema"

export const classesApi = {
  list: () => http.get<ClassListItem[]>("/api/classes"),
  get: (id: string) => http.get<ClassListItem>(`/api/classes/${id}`),
  create: (data: ClassCreateInput) => http.post<ClassListItem>("/api/classes", data),
  update: (id: string, data: ClassUpdateInput) =>
    http.patch<ClassListItem>(`/api/classes/${id}`, data),
}
