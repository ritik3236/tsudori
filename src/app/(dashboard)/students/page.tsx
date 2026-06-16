import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { Fab } from "@/components/shared/fab"
import { Button } from "@/components/ui/button"
import { StudentsTable } from "@/features/students/components/students-table"

export const metadata: Metadata = { title: "Students" }

export default async function StudentsPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_READ)

  const canCreate = can(ctx, PERMISSIONS.STUDENT_CREATE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student profiles, classes, and admissions."
        actions={
          canCreate && (
            <Button
              className="hidden lg:inline-flex"
              render={
                <Link href="/students/new">
                  <Plus className="size-4" /> Add student
                </Link>
              }
            />
          )
        }
      />
      <StudentsTable
        canEdit={can(ctx, PERMISSIONS.STUDENT_UPDATE)}
        canArchive={can(ctx, PERMISSIONS.STUDENT_ARCHIVE)}
      />

      {/* Mobile primary action lives in the thumb zone instead of the header */}
      {canCreate && <Fab href="/students/new" label="Add student" icon={Plus} />}
    </div>
  )
}
