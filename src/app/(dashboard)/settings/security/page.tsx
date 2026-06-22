import type { Metadata } from "next"

import { getTenantContext } from "@/lib/tenant"
import { SecurityView } from "@/features/account/components/security-view"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"

export const metadata: Metadata = { title: "Security" }

// Personal security — open to every signed-in member (no permission gate). All
// data is read/written for the caller's own account via the Neon Auth client.
export default async function SecurityPage() {
  await getTenantContext() // gate: must be a signed-in member of an institute

  return (
    <div className="space-y-6">
      <BackLink href="/settings" label="Settings" />
      <PageHeader
        title="Security"
        description="Your active sessions and password. Spot anything off and shut it down."
      />
      <SecurityView />
    </div>
  )
}
