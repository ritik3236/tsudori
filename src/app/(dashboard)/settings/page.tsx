import type { Metadata } from "next"

import { getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { SettingsHub } from "@/features/settings/components/settings-hub"
import { visibleSettingsSections } from "@/features/settings/sections"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.SETTING_READ)

  const sections = visibleSettingsSections(ctx.permissions)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your institute profile, team, fees, and more."
      />
      <SettingsHub sections={sections} />
    </div>
  )
}
