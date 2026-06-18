import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError } from "@/lib/errors"
import { MAX_PAGE_SIZE } from "@/lib/constants"
import { makeServerQueryClient } from "@/lib/query"
import { getClass } from "@/features/classes/service"
import { listStudents } from "@/features/students/service"
import { studentKeys } from "@/features/students/api"
import { ClassDetail } from "@/features/classes/components/class-detail"
import { BackLink } from "@/components/shared/back-link"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const ctx = await getTenantContext()
  try {
    const cls = await getClass(ctx.institute.id, id)
    return { title: cls.name }
  } catch {
    return { title: "Class" }
  }
}

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.CLASS_READ)

  let cls: Awaited<ReturnType<typeof getClass>>
  try {
    cls = await getClass(ctx.institute.id, id)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  // Prefetch the enrolled students here so the list paints with the page instead
  // of the client firing a second round trip (which re-runs the whole auth chain
  // and flashes a skeleton). Key + params must match useStudents() in
  // ClassStudentsList exactly, or the client won't reuse the hydrated data.
  const studentParams = { classId: id, pageSize: MAX_PAGE_SIZE }
  const qc = makeServerQueryClient()
  await qc.prefetchQuery({
    queryKey: studentKeys.list(studentParams),
    queryFn: () =>
      listStudents(ctx.institute.id, {
        ...studentParams,
        page: 1,
        includeArchived: false,
      }),
  })

  return (
    <div className="space-y-6">
      <BackLink href="/classes" label="Classes" />
      <HydrationBoundary state={dehydrate(qc)}>
        <ClassDetail
          cls={cls}
          canManage={can(ctx, PERMISSIONS.CLASS_MANAGE)}
          canEditStudents={can(ctx, PERMISSIONS.STUDENT_UPDATE)}
          canArchiveStudents={can(ctx, PERMISSIONS.STUDENT_ARCHIVE)}
        />
      </HydrationBoundary>
    </div>
  )
}
