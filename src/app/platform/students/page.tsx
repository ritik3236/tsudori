import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getSuperAdminContext } from "@/lib/tenant"
import { makeServerQueryClient } from "@/lib/query"
import { platformKeys } from "@/features/platform/api"
import { listPlatformStudents } from "@/features/platform/service"
import { PlatformStudentsList } from "@/features/platform/components/platform-students-list"

export const metadata: Metadata = { title: "Students" }

export default async function PlatformStudentsPage() {
  const ctx = await getSuperAdminContext()

  // Prefetch the first page server-side. Key must match PlatformStudentsList's
  // first-render usePlatformStudents() key — q/status/archived are undefined
  // there, so they drop out of the hashed key (matching {}).
  const qc = makeServerQueryClient()
  await qc.prefetchInfiniteQuery({
    queryKey: platformKeys.students({}),
    queryFn: () => listPlatformStudents(ctx, { offset: 0, archived: false }),
    initialPageParam: 0,
  })

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground text-sm">
            Every student across all institutes.
          </p>
        </div>
        <PlatformStudentsList />
      </div>
    </HydrationBoundary>
  )
}
