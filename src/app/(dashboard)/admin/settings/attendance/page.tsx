import type { Metadata } from "next"

import { getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { AttendanceSettings } from "@/features/attendance/components/attendance-settings"

export const metadata: Metadata = { title: "Attendance" }

export default async function AttendanceSettingsPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.ATTENDANCE_CONFIGURE)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <BackLink href="/admin/settings" label="Admin" />
        <PageHeader
          title="Attendance"
          description="Weekly off and holidays. These decide which days attendance can be taken."
        />
      </div>
      <AttendanceSettings />
    </div>
  )
}
