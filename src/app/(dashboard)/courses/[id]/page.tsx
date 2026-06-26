import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { can, getTenantContext, requirePagePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError } from "@/lib/errors"
import { getCourse, listCourseStudents } from "@/features/course/service"
import { CourseDetail } from "@/features/course/components/course-detail"
import { BackLink } from "@/components/shared/back-link"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const ctx = await getTenantContext()
  try {
    const course = await getCourse(ctx.institute.id, id)
    return { title: course.name }
  } catch {
    return { title: "Course" }
  }
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params
  const ctx = await getTenantContext()
  requirePagePermission(ctx, PERMISSIONS.COURSE_READ)

  let course: Awaited<ReturnType<typeof getCourse>>
  try {
    course = await getCourse(ctx.institute.id, id)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }
  const students = await listCourseStudents(ctx.institute.id, id)

  return (
    <div className="space-y-6">
      <BackLink href="/courses" label="Courses" />
      <CourseDetail
        course={course}
        students={students}
        canManage={can(ctx, PERMISSIONS.COURSE_MANAGE)}
      />
    </div>
  )
}
