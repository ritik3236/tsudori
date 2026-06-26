import { http } from "@/lib/http"
import type { CourseListItem } from "@/features/course/types"
import type { CourseCreateInput, CourseUpdateInput } from "@/features/course/schema"

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
}

export const coursesApi = {
  list: () => http.get<CourseListItem[]>("/api/courses"),
  get: (id: string) => http.get<CourseListItem>(`/api/courses/${id}`),
  create: (data: CourseCreateInput) => http.post<CourseListItem>("/api/courses", data),
  update: (id: string, data: CourseUpdateInput) =>
    http.patch<CourseListItem>(`/api/courses/${id}`, data),
}
