import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { makeServerQueryClient } from "@/lib/query"
import { studentKeys } from "@/features/students/api"
import { listStudents } from "@/features/students/service"
import { Button } from "@/components/ui/button"
import { StudentsTable } from "@/features/students/components/students-table"

export const metadata: Metadata = { title: "Students" }

export default async function StudentsPage() {
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.STUDENT_READ)

  const canCreate = can(ctx, PERMISSIONS.STUDENT_CREATE)

  // Prefetch the first page server-side so the list renders with data instead of
  // a skeleton + client round-trip. Key must match StudentsTable's first-render
  // useStudents() key — q/status/classId are undefined there, so they drop out.
  const qc = makeServerQueryClient()
  await qc.prefetchInfiniteQuery({
    queryKey: studentKeys.list({}),
    queryFn: () => listStudents(ctx.institute.id, { offset: 0, includeArchived: false }),
    initialPageParam: 0,
  })

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="space-y-4">
        <StudentsTable />

        {/* Primary action floats bottom-right (mobile + desktop), like "Add class". */}
        {canCreate && (
          <Button
            size="sm"
            className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 rounded-full shadow-lg lg:right-6 lg:bottom-6"
            render={
              <Link href="/students/new">
                <Plus className="size-4" /> Add student
              </Link>
            }
          />
        )}
      </div>
    </HydrationBoundary>
  )
}
