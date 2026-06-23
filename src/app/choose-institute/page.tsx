import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { InstitutePicker } from "@/features/institute/components/institute-picker"
import type { InstituteOption } from "@/features/institute/types"

export const metadata: Metadata = { title: "Choose institute" }

// Pre-tenant step (outside the (dashboard) group, so no AppShell chrome). The
// dashboard layout redirects here when the active institute is only a fallback
// and the choice is ambiguous. Single-institute members are sent straight on.
export default async function ChooseInstitutePage() {
  const user = await requireUser()
  const isSuperAdmin = user.role === "admin"

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { institute: true, role: true },
    orderBy: { createdAt: "asc" },
  })

  if (!isSuperAdmin && memberships.length <= 1) redirect("/dashboard")

  const myInstitutes: InstituteOption[] = memberships.map((m) => ({
    id: m.institute.id,
    name: m.institute.name,
    logoUrl: m.institute.logoUrl,
    roleName: m.role.name,
    status: m.institute.status,
  }))

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="bg-card w-full max-w-md space-y-5 rounded-xl border p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">Choose an institute</h1>
          <p className="text-muted-foreground text-sm">
            {isSuperAdmin
              ? "Pick an institute to manage."
              : "You belong to more than one — pick one to continue."}
          </p>
        </div>
        <InstitutePicker myInstitutes={myInstitutes} isSuperAdmin={isSuperAdmin} />
      </div>
    </div>
  )
}
