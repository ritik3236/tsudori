import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { courseKeys } from "@/features/course/api"
import { listCourses } from "@/features/course/service"
import { CoursesTable } from "@/features/course/components/courses-table"

export const metadata: Metadata = { title: "Courses" }

export default async function CoursesPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.COURSE_READ)

  const canManage = can(ctx, PERMISSIONS.COURSE_MANAGE)

  const qc = makeServerQueryClient()
  await qc.prefetchQuery({
    queryKey: courseKeys.lists(),
    queryFn: () => listCourses(ctx.institute.id),
  })

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CoursesTable canManage={canManage} />
    </HydrationBoundary>
  )
}
