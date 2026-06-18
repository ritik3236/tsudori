import type { Metadata } from "next"

import { getTenantContext } from "@/lib/tenant"
import { PageHeader } from "@/components/shared/page-header"
import { SettingsHub } from "@/features/settings/components/settings-hub"
import {
  ADMIN_SETTINGS_SECTIONS,
  visibleSettingsSections,
} from "@/features/settings/sections"

export const metadata: Metadata = { title: "Admin" }

// Admin hub. Access is permission-gated by src/app/(dashboard)/admin/layout.tsx
// (any admin permission); each row below filters to the viewer's permissions.
export default async function AdminSettingsPage() {
  const ctx = await getTenantContext()
  const sections = visibleSettingsSections(ADMIN_SETTINGS_SECTIONS, ctx.permissions)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Manage your institute, team, roles, and configuration."
      />
      <SettingsHub sections={sections} />
    </div>
  )
}
