import type { Metadata } from "next"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { AttendancePage } from "@/features/attendance/components/attendance-page"

export const metadata: Metadata = { title: "Attendance" }

export default async function AttendanceRoute() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_READ)

  return <AttendancePage canMark={can(ctx, PERMISSIONS.ATTENDANCE_MARK)} />
}
