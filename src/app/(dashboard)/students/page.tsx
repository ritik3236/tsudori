import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { studentKeys } from "@/features/students/api"
import { listStudents } from "@/features/students/service"
import { StudentsTable } from "@/features/students/components/students-table"
import { AddStudentButton } from "@/features/students/components/add-student-button"

export const metadata: Metadata = { title: "Students" }

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.STUDENT_READ)

  const canCreate = can(ctx, PERMISSIONS.STUDENT_CREATE)
  // Deep link (e.g. the dashboard "Add student") opens the create modal directly.
  const openCreate = canCreate && (await searchParams).new === "1"

  // Prefetch the first page server-side so the list renders with data instead of
  // a skeleton + client round-trip. Key must match StudentsTable's first-render
  // useStudents() key — q/status/classId are undefined there, so they drop out.
  const qc = makeServerQueryClient()
  await qc.prefetchInfiniteQuery({
    queryKey: studentKeys.list({}),
    queryFn: () => listStudents(ctx.institute.id, { offset: 0, archived: false }),
    initialPageParam: 0,
  })

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="space-y-4">
        <StudentsTable />

        {/* Primary action: a FAB that opens the create-student modal (no page nav). */}
        {canCreate && <AddStudentButton defaultOpen={openCreate} />}
      </div>
    </HydrationBoundary>
  )
}
