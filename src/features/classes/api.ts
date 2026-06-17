import { http } from "@/lib/http"
import type { ClassListItem } from "@/features/classes/types"
import type { ClassCreateInput, ClassUpdateInput } from "@/features/classes/schema"

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const classKeys = {
  all: ["classes"] as const,
  lists: () => [...classKeys.all, "list"] as const,
  details: () => [...classKeys.all, "detail"] as const,
  detail: (id: string) => [...classKeys.details(), id] as const,
}

export const classesApi = {
  list: () => http.get<ClassListItem[]>("/api/classes"),
  get: (id: string) => http.get<ClassListItem>(`/api/classes/${id}`),
  create: (data: ClassCreateInput) => http.post<ClassListItem>("/api/classes", data),
  update: (id: string, data: ClassUpdateInput) =>
    http.patch<ClassListItem>(`/api/classes/${id}`, data),
}
