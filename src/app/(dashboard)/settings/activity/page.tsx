import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getTenantContext } from "@/lib/tenant"
import { makeServerQueryClient } from "@/lib/query"
import { auditKeys } from "@/features/audit/api"
import { listAuditLog } from "@/features/audit/service"
import { AuditView } from "@/features/audit/components/audit-view"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"

export const metadata: Metadata = { title: "Your activity" }

// Personal activity — open to every signed-in member (no permission gate). The
// feed is forced to the caller's own events both here and in /api/activity.
export default async function MyActivityPage() {
  const ctx = await getTenantContext()

  // Prefetch the first page so the list paints with the page. Key must match
  // AuditView's first-render useAuditLog({ mine: true }) key (undefined filters
  // drop out of the hash, leaving { mine: true }).
  const qc = makeServerQueryClient()
  await qc.prefetchInfiniteQuery({
    queryKey: auditKeys.list({ mine: true }),
    queryFn: () =>
      listAuditLog(ctx.institute.id, { offset: 0, actorId: ctx.user.id }),
    initialPageParam: 0,
  })

  return (
    <div className="space-y-6">
      <BackLink href="/settings" label="Settings" />
      <PageHeader
        title="Your activity"
        description="A record of what you've done — fees you collected, sign-ins, and password changes."
      />
      <HydrationBoundary state={dehydrate(qc)}>
        <AuditView mine />
      </HydrationBoundary>
    </div>
  )
}
