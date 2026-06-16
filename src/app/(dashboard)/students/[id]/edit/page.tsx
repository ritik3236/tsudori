import type { Metadata } from "next"

import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { Card, CardContent } from "@/components/ui/card"
import { EditStudent } from "@/features/students/components/edit-student"

export const metadata: Metadata = { title: "Edit student" }

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_UPDATE)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/students/${id}`} label="Back to profile" />
      <PageHeader title="Edit student" description="Update this student's details." />
      <Card>
        <CardContent className="pt-6">
          <EditStudent studentId={id} />
        </CardContent>
      </Card>
    </div>
  )
}
