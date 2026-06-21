import { buildQuery, http } from "@/lib/http"
import type { AuditPage } from "@/features/audit/types"

export type AuditListParams = {
  actorId?: string
  entityType?: string
  from?: string
  to?: string
}

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (params: AuditListParams) => [...auditKeys.lists(), params] as const,
}

export const auditApi = {
  list: (params: AuditListParams, offset = 0) =>
    http.get<AuditPage>(
      `/api/audit${buildQuery({ ...params, offset: offset || undefined })}`
    ),
}
