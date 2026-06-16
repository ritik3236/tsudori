import type { Metadata } from "next"
import { CalendarCheck } from "lucide-react"

import { getTenantContext } from "@/lib/tenant"
import { requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata: Metadata = { title: "Attendance" }

export default async function AttendancePage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_READ)

  return (
    <ModulePlaceholder
      title="Attendance"
      description="Mark daily attendance and review monthly reports."
      icon={CalendarCheck}
      features={[
        "Daily and bulk attendance marking by class",
        "Present / Absent / Leave statuses",
        "Duplicate prevention per student per day",
        "Attendance history and monthly reports",
      ]}
    />
  )
}
