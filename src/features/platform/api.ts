import type { StudentStatus } from "@prisma/client"

import { buildQuery, http } from "@/lib/http"
import type { PlatformStudentPage } from "@/features/platform/service"

export type PlatformStudentParams = {
  q?: string
  status?: StudentStatus
  /** Show only archived (soft-deleted) students. */
  archived?: boolean
}

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const platformKeys = {
  all: ["platform"] as const,
  students: (params: PlatformStudentParams) =>
    [...platformKeys.all, "students", params] as const,
}

export const platformApi = {
  students: (params: PlatformStudentParams, offset = 0) =>
    http.get<PlatformStudentPage>(
      `/api/platform/students${buildQuery({ ...params, offset: offset || undefined })}`
    ),
}
