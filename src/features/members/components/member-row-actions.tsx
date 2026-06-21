"use client"

import { useState } from "react"
import { Ban, KeyRound, MoreHorizontal, RotateCcw, ShieldCheck, Trash2, UserCog } from "lucide-react"

import type { MemberListItem } from "@/features/members/types"
import { useRemoveMember, useRestoreMember, useUnbanMember } from "@/features/members/hooks"
import { ChangeRoleDialog } from "@/features/members/components/change-role-dialog"
import { BanMemberDialog } from "@/features/members/components/ban-member-dialog"
import { ResetPasswordDialog } from "@/features/members/components/reset-password-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

type Dialog = "role" | "reset" | "ban" | "unban" | "remove" | null

type MemberRowActionsProps = {
  member: MemberListItem
  /** Manage membership (change role, remove) — institute admin and up. */
  canManageMembers: boolean
  /** Manage the identity (reset password, ban) — platform super admin only. */
  canManageIdentities: boolean
  /** True for the signed-in user's own row — self-mutations are blocked. */
  isSelf: boolean
}

export function MemberRowActions({
  member,
  canManageMembers,
  canManageIdentities,
  isSelf,
}: MemberRowActionsProps) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const remove = useRemoveMember()
  const restore = useRestoreMember()
  const unban = useUnbanMember(member.userId)

  // A removed (suspended) member has no access; the only sensible action is to
  // restore them — the active-member actions don't apply.
  const isRemoved = member.status === "SUSPENDED"

  // The platform super admin can't be demoted or removed by other admins —
  // mirror the server guard so those actions never appear on their row.
  const canChangeRole = canManageMembers && !isSelf && !member.isSuperAdmin && !isRemoved
  const canResetPassword = canManageIdentities && !isRemoved
  const canBan = canManageIdentities && !isSelf && !isRemoved
  const canRemove = canManageMembers && !isSelf && !member.isSuperAdmin && !isRemoved
  const canRestore = canManageMembers && isRemoved && !member.isSuperAdmin

  // Nothing to offer (e.g. own row without identity powers) — render no menu.
  if (!canChangeRole && !canResetPassword && !canBan && !canRemove && !canRestore)
    return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`Actions for ${member.name}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          {canRestore && (
            <DropdownMenuItem
              onClick={() => restore.mutate(member.userId)}
              disabled={restore.isPending}
            >
              <RotateCcw className="size-4" /> Restore to institute
            </DropdownMenuItem>
          )}
          {canChangeRole && (
            <DropdownMenuItem onClick={() => setDialog("role")}>
              <UserCog className="size-4" /> Change role
            </DropdownMenuItem>
          )}
          {canResetPassword && (
            <DropdownMenuItem onClick={() => setDialog("reset")}>
              <KeyRound className="size-4" /> Reset password
            </DropdownMenuItem>
          )}
          {canBan &&
            (member.banned ? (
              <DropdownMenuItem onClick={() => setDialog("unban")}>
                <ShieldCheck className="size-4" /> Unban member
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onClick={() => setDialog("ban")}>
                <Ban className="size-4" /> Ban member
              </DropdownMenuItem>
            ))}
          {canRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDialog("remove")}>
                <Trash2 className="size-4" /> Remove from institute
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canChangeRole && (
        <ChangeRoleDialog
          open={dialog === "role"}
          onOpenChange={(open) => !open && setDialog(null)}
          userId={member.userId}
          memberName={member.name}
          currentRoleId={member.roleId}
        />
      )}

      {canResetPassword && (
        <ResetPasswordDialog
          open={dialog === "reset"}
          onOpenChange={(open) => !open && setDialog(null)}
          userId={member.userId}
          memberName={member.name}
        />
      )}

      {canBan && (
        <>
          <BanMemberDialog
            open={dialog === "ban"}
            onOpenChange={(open) => !open && setDialog(null)}
            userId={member.userId}
            memberName={member.name}
          />
          <ConfirmDialog
            open={dialog === "unban"}
            onOpenChange={(open) => !open && setDialog(null)}
            title={`Unban ${member.name}?`}
            description="They'll be able to sign in again."
            confirmLabel="Unban"
            loading={unban.isPending}
            onConfirm={() => unban.mutate(undefined, { onSuccess: () => setDialog(null) })}
          />
        </>
      )}

      {canRemove && (
        <ConfirmDialog
          open={dialog === "remove"}
          onOpenChange={(open) => !open && setDialog(null)}
          title={`Remove ${member.name}?`}
          description="They lose access immediately and move to Removed. Their sign-in is kept — you can restore them anytime."
          confirmLabel="Remove"
          variant="destructive"
          loading={remove.isPending}
          onConfirm={() =>
            remove.mutate(member.userId, { onSuccess: () => setDialog(null) })
          }
        />
      )}
    </>
  )
}
