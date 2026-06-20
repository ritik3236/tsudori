import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { AppearanceSettings } from "@/features/settings/components/appearance-settings"

export const metadata: Metadata = { title: "Appearance" }

// Personal appearance — theme + font, per device. No permission gate.
export default function AppearancePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <BackLink href="/settings" label="Settings" />
        <PageHeader title="Appearance" description="Theme and font for this device." />
      </div>
      <AppearanceSettings />
    </div>
  )
}
