import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { todayInAppTz } from "@/lib/date-helper"
import { classKeys } from "@/features/classes/api"
import { listClasses } from "@/features/classes/service"
import { attendanceKeys } from "@/features/attendance/keys"
import { ALL_CLASSES, getAttendanceDay } from "@/features/attendance/service"
import { AttendancePage } from "@/features/attendance/components/attendance-page"

export const metadata: Metadata = { title: "Attendance" }

export default async function AttendanceRoute() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_READ)

  // Default view is "All classes" for today (IST). Prefetch the class dropdown
  // and that day so the page paints marked rows without a client round-trip.
  const today = todayInAppTz()
  const qc = makeServerQueryClient()
  await Promise.all([
    qc.prefetchQuery({
      queryKey: classKeys.lists(),
      queryFn: () => listClasses(ctx.institute.id),
    }),
    qc.prefetchQuery({
      queryKey: attendanceKeys.day(ALL_CLASSES, today),
      queryFn: () => getAttendanceDay(ctx.institute.id, ALL_CLASSES, today),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <AttendancePage canMark={can(ctx, PERMISSIONS.ATTENDANCE_MARK)} />
    </HydrationBoundary>
  )
}
