import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError } from "@/lib/errors"
import { getStudent } from "@/features/students/service"
import { StudentProfile } from "@/features/students/components/student-profile"
import { BackLink } from "@/components/shared/back-link"

export const metadata: Metadata = { title: "Student" }

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.STUDENT_READ)

  let student: Awaited<ReturnType<typeof getStudent>>
  try {
    student = await getStudent(ctx.institute.id, id, {
      includeFinancials: can(ctx, PERMISSIONS.FEE_READ),
    })
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  return (
    <div className="space-y-6">
      <BackLink href="/students" label="Students" />
      <StudentProfile
        student={student}
        canViewFees={can(ctx, PERMISSIONS.FEE_READ)}
        canEdit={can(ctx, PERMISSIONS.STUDENT_UPDATE)}
        canArchive={can(ctx, PERMISSIONS.STUDENT_ARCHIVE)}
      />
    </div>
  )
}
