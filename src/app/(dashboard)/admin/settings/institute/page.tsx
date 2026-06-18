import type { Metadata } from "next"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { toInstituteProfile } from "@/features/institute/service"
import { InstituteProfileForm } from "@/features/institute/components/institute-profile-form"

export const metadata: Metadata = { title: "Institute profile" }

export default async function InstituteProfilePage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.INSTITUTE_READ)

  // The institute is already loaded on the tenant context — no extra query.
  const profile = toInstituteProfile(ctx.institute)
  const canManage = can(ctx, PERMISSIONS.INSTITUTE_MANAGE)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <BackLink href="/admin/settings" label="Admin" />
        <PageHeader
          title="Institute profile"
          description={
            canManage
              ? "Your institute's logo, name, and contact details."
              : "Your institute's logo, name, and contact details (view only)."
          }
        />
      </div>
      <InstituteProfileForm profile={profile} canManage={canManage} />
    </div>
  )
}
