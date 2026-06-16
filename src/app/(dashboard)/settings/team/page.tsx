import type { Metadata } from "next"

import { can, getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { MembersCard } from "@/features/members/components/members-card"

export const metadata: Metadata = { title: "Team members" }

export default async function TeamSettingsPage() {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.MEMBER_READ)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink href="/settings" label="Settings" />
        <PageHeader
          title="Team members"
          description={
            ctx.isSuperAdmin
              ? "Add members, change roles, reset passwords, and ban access."
              : "People with access to this institute and their roles."
          }
        />
      </div>
      <MembersCard
        canManageMembers={can(ctx, PERMISSIONS.MEMBER_MANAGE)}
        canManageIdentities={ctx.isSuperAdmin}
        currentUserId={ctx.user.id}
      />
    </div>
  )
}
