import type { Metadata } from "next"

import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { Card, CardContent } from "@/components/ui/card"
import { CreateStudent } from "@/features/students/components/create-student"

export const metadata: Metadata = { title: "Add student" }

export default async function NewStudentPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_CREATE)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/students" label="Students" />
      <PageHeader title="Add student" description="Create a new student record." />
      <Card>
        <CardContent className="pt-6">
          <CreateStudent />
        </CardContent>
      </Card>
    </div>
  )
}
