import type { Metadata } from "next"

import { getTenantContext } from "@/lib/tenant"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { AccountForm } from "@/features/account/components/account-form"

export const metadata: Metadata = { title: "Your profile" }

// Self-service account page — any signed-in member can update their own name and
// password. No permission gate.
export default async function YourProfilePage() {
  const ctx = await getTenantContext()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <BackLink href="/settings" label="Settings" />
        <PageHeader title="Your profile" description="Update your name and password." />
      </div>
      <AccountForm name={ctx.user.name} email={ctx.user.email} />
    </div>
  )
}
