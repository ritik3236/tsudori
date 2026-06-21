// Wire DTO for the audit view. The actor is resolved to a name; metadata is the
// raw JSON the service stored (amounts, names, before/after).
export type AuditLogItem = {
  id: string
  action: string
  entityType: string
  entityId: string
  actorName: string | null
  actorImage: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

/** Offset-paged slice for the infinite-scroll audit list. */
export type AuditPage = {
  items: AuditLogItem[]
  nextOffset: number | null
  total: number
}
