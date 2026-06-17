import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { Fab } from "@/components/shared/fab"
import { Button } from "@/components/ui/button"
import { StudentsTable } from "@/features/students/components/students-table"

export const metadata: Metadata = { title: "Students" }

export default async function StudentsPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_READ)

  const canCreate = can(ctx, PERMISSIONS.STUDENT_CREATE)

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="hidden justify-end lg:flex">
          <Button
            render={
              <Link href="/students/new">
                <Plus className="size-4" /> Add student
              </Link>
            }
          />
        </div>
      )}
      <StudentsTable
        canEdit={can(ctx, PERMISSIONS.STUDENT_UPDATE)}
        canArchive={can(ctx, PERMISSIONS.STUDENT_ARCHIVE)}
      />

      {/* Mobile primary action lives in the thumb zone */}
      {canCreate && <Fab href="/students/new" label="Add student" icon={Plus} />}
    </div>
  )
}
