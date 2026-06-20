import type { Metadata } from "next"

import { getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { getInstituteAppearance } from "@/features/appearance/service"
import { InstituteAppearanceSettings } from "@/features/settings/components/institute-appearance-settings"

export const metadata: Metadata = { title: "Appearance" }

export default async function InstituteAppearancePage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.INSTITUTE_MANAGE)

  const current = (await getInstituteAppearance(ctx.institute.id)) ?? {
    theme: null,
    font: null,
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <BackLink href="/admin/settings" label="Admin" />
        <PageHeader
          title="Appearance"
          description="The default theme and font new members inherit until they choose their own."
        />
      </div>
      <InstituteAppearanceSettings current={current} />
    </div>
  )
}
