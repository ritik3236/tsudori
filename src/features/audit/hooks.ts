"use client"

import { useInfiniteList } from "@/lib/use-infinite-list"
import { auditApi, auditKeys, type AuditListParams } from "@/features/audit/api"

export { auditKeys }

// Infinite scroll over the audit log; keepPrevious so changing a filter doesn't
// flash a skeleton.
export function useAuditLog(params: AuditListParams) {
  return useInfiniteList({
    queryKey: auditKeys.list(params),
    queryFn: (offset) => auditApi.list(params, offset),
    keepPrevious: true,
  })
}
