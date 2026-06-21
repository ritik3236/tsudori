"use client"

import { useState } from "react"
import { UserPlus, Users } from "lucide-react"
import type { MembershipStatus } from "@prisma/client"

import { cn } from "@/lib/utils"
import { formatDateShort, getInitials } from "@/lib/format"
import { useMembers } from "@/features/members/hooks"
import { AddMemberDialog } from "@/features/members/components/add-member-dialog"
import { InviteMemberButton } from "@/features/invitations/components/invite-member-button"
import { MemberRowActions } from "@/features/members/components/member-row-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type MembersCardProps = {
  /** Manage membership (change role, remove) — institute admin and up. */
  canManageMembers: boolean
  /** Manage the identity (add, reset password, ban) — platform super admin only. */
  canManageIdentities: boolean
  /** The signed-in user's id, so their own row hides self-mutations. */
  currentUserId: string
}

export function MembersCard({
  canManageMembers,
  canManageIdentities,
  currentUserId,
}: MembersCardProps) {
  const { data: members, isLoading } = useMembers()
  const [addOpen, setAddOpen] = useState(false)
  const [showRemoved, setShowRemoved] = useState(false)

  const showActions = canManageMembers || canManageIdentities
  const colSpan = showActions ? 5 : 4

  // Removed members are suspended rows — hidden from the active roster, revealed
  // by the toggle below so they can be restored.
  const active = members?.filter((m) => m.status !== "SUSPENDED") ?? []
  const removed = members?.filter((m) => m.status === "SUSPENDED") ?? []
  const visible = showRemoved ? [...active, ...removed] : active

  const renderActions = (memberId: string) => {
    const member = members?.find((m) => m.membershipId === memberId)
    if (!member) return null
    return (
      <MemberRowActions
        member={member}
        canManageMembers={canManageMembers}
        canManageIdentities={canManageIdentities}
        isSelf={member.userId === currentUserId}
      />
    )
  }

  return (
    <div className="space-y-4">
      {(canManageMembers || canManageIdentities) && (
        <div className="flex gap-2 sm:justify-end">
          {/* Invite (member:manage) — sends a link, no super-admin needed. */}
          {canManageMembers && <InviteMemberButton />}
          {/* Direct create (super admin only) — instant account, no invitee step. */}
          {canManageIdentities && (
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" /> Add member
            </Button>
          )}
        </div>
      )}

      {/* Desktop: a dense table. Hidden on mobile where the columns would force a
          horizontal scroll and bury the row actions off-screen. */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colSpan}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : visible.length > 0 ? (
              visible.map((m) => (
                <TableRow
                  key={m.membershipId}
                  className={cn(m.status === "SUSPENDED" && "opacity-60")}
                >
                  <TableCell>
                    <MemberIdentity name={m.name} email={m.email} />
                  </TableCell>
                  <TableCell>
                    <RoleCell roleName={m.roleName} isSuperAdmin={m.isSuperAdmin} />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateShort(m.joinedAt)}
                  </TableCell>
                  <TableCell>
                    <MemberStatus banned={m.banned} banReason={m.banReason} status={m.status} />
                  </TableCell>
                  {showActions && <TableCell>{renderActions(m.membershipId)}</TableCell>}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <MembersEmpty />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: each member as a compact card. Actions sit in the top-right
          corner (absolute) so they never push content around. */}
      <div className="space-y-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-3.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </div>
          ))
        ) : visible.length > 0 ? (
          visible.map((m) => (
            <div
              key={m.membershipId}
              className={cn(
                "bg-card relative rounded-xl border p-3.5",
                m.status === "SUSPENDED" && "opacity-60"
              )}
            >
              <div className={showActions ? "pr-9" : undefined}>
                <MemberIdentity name={m.name} email={m.email} />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">{m.roleName}</span>
                  {m.isSuperAdmin && <Badge variant="secondary">Super admin</Badge>}
                  <span className="text-muted-foreground text-xs">·</span>
                  <MemberStatus banned={m.banned} banReason={m.banReason} status={m.status} />
                  <span className="text-muted-foreground text-xs tabular-nums">
                    · {formatDateShort(m.joinedAt)}
                  </span>
                </div>
              </div>
              {showActions && (
                <div className="absolute top-2 right-2">
                  {renderActions(m.membershipId)}
                </div>
              )}
            </div>
          ))
        ) : (
          <MembersEmpty />
        )}
      </div>

      {/* Reveal removed (suspended) members so they can be restored. */}
      {removed.length > 0 && (
        <button
          type="button"
          onClick={() => setShowRemoved((v) => !v)}
          className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-2 hover:underline"
        >
          {showRemoved ? "Hide" : "Show"} removed ({removed.length})
        </button>
      )}

      {canManageIdentities && (
        <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      )}
    </div>
  )
}

function MemberIdentity({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-muted-foreground truncate text-xs">{email}</div>
      </div>
    </div>
  )
}

function RoleCell({
  roleName,
  isSuperAdmin,
}: {
  roleName: string
  isSuperAdmin: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-sm">{roleName}</span>
      {isSuperAdmin && <Badge variant="secondary">Super admin</Badge>}
    </div>
  )
}

function MemberStatus({
  banned,
  banReason,
  status,
}: {
  banned: boolean
  banReason: string | null
  status: MembershipStatus
}) {
  if (banned) return <BannedBadge banReason={banReason} />
  if (status === "SUSPENDED") return <Badge variant="secondary">Removed</Badge>
  return <StatusBadge active={status === "ACTIVE"} />
}

function BannedBadge({ banReason }: { banReason: string | null }) {
  if (!banReason) return <Badge variant="destructive">Banned</Badge>
  return (
    <Tooltip>
      <TooltipTrigger delay={300} render={<Badge variant="destructive" />}>
        Banned
      </TooltipTrigger>
      <TooltipContent>{banReason}</TooltipContent>
    </Tooltip>
  )
}

function MembersEmpty() {
  return (
    <EmptyState
      icon={Users}
      title="No team members yet"
      description="Members appear here once they're invited to the institute."
      className="border-0"
    />
  )
}
