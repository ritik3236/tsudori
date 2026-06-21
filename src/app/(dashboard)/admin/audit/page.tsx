import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { auditKeys } from "@/features/audit/api"
import { listAuditLog } from "@/features/audit/service"
import { AuditView } from "@/features/audit/components/audit-view"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"

export const metadata: Metadata = { title: "Audit log" }

export default async function AuditPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.AUDIT_READ)

  // Prefetch the first (unfiltered) page so the list paints with the page. Key
  // must match AuditView's first-render useAuditLog() key (all filters undefined).
  const qc = makeServerQueryClient()
  await qc.prefetchInfiniteQuery({
    queryKey: auditKeys.list({}),
    queryFn: () => listAuditLog(ctx.institute.id, { offset: 0 }),
    initialPageParam: 0,
  })

  return (
    <div className="space-y-6">
      <BackLink href="/admin/settings" label="Admin" />
      <PageHeader
        title="Audit log"
        description="A record of sensitive changes — reversals, role changes, archives, and waivers — and who made them."
      />
      <HydrationBoundary state={dehydrate(qc)}>
        <AuditView />
      </HydrationBoundary>
    </div>
  )
}
