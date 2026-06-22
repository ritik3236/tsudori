import { buildQuery, http } from "@/lib/http"
import type { AuditPage } from "@/features/audit/types"

export type AuditListParams = {
  actorId?: string
  entityType?: string
  from?: string
  to?: string
  /**
   * When true, reads the caller's OWN activity from /api/activity (no AUDIT_READ
   * needed) instead of the institute-wide /api/audit. The actor is forced to the
   * caller server-side, so actorId is irrelevant here.
   */
  mine?: boolean
}

// Query-key factory. Lives here (not in the "use client" hooks file) so server
// components can import it for prefetch without crossing the client boundary.
export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (params: AuditListParams) => [...auditKeys.lists(), params] as const,
}

export const auditApi = {
  list: (params: AuditListParams, offset = 0) => {
    const { mine, ...filters } = params
    const path = mine ? "/api/activity" : "/api/audit"
    return http.get<AuditPage>(
      `${path}${buildQuery({ ...filters, offset: offset || undefined })}`
    )
  },
}
