import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError } from "@/lib/errors"
import { getClass } from "@/features/classes/service"
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

  return (
    <div className="space-y-6">
      <BackLink href="/classes" label="Classes" />
      <ClassDetail
        cls={cls}
        canManage={can(ctx, PERMISSIONS.CLASS_MANAGE)}
        canEditStudents={can(ctx, PERMISSIONS.STUDENT_UPDATE)}
        canArchiveStudents={can(ctx, PERMISSIONS.STUDENT_ARCHIVE)}
      />
    </div>
  )
}
