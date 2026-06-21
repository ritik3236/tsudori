import { z } from "zod"

// Audit list query (all optional). `from`/`to` are app-tz date strings
// (YYYY-MM-DD); the service expands them to UTC day bounds.
export const auditQuerySchema = z.object({
  actorId: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AuditQuery = z.infer<typeof auditQuerySchema>
