import "server-only"

import { randomBytes } from "node:crypto"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { roleWeight } from "@/lib/rbac"
import { nowDate, nowPlus } from "@/lib/date-helper"
import { AUDIT_ACTIONS, recordAudit } from "@/features/audit/service"
import type { InviteCreateInput } from "@/features/invitations/schema"
import type { InvitationPreview } from "@/features/invitations/types"

const INVITE_TTL_DAYS = 7

/**
 * Who is sending the invite — used to block privilege escalation on the grant
 * (mirrors the `Editor` concept in src/features/roles/service.ts and
 * `RoleGrantActor` in the members service). A non-super-admin can only invite
 * into roles strictly below their own seniority whose permissions are a subset
 * of their own. Super admins bypass both checks.
 */
export type InviteActor = {
  /** roleWeight() of the actor's own role. */
  weight: number
  /** The actor's own granted permission keys. */
  permissions: ReadonlySet<string>
  isSuperAdmin: boolean
}

/**
 * Creates a pending invite for `email` to join `instituteId` with `roleId` and
 * returns its token. The admin shares the resulting /invite/<token> link. Any
 * earlier pending invite for the same email+institute is revoked so only the
 * latest link is valid.
 */
export async function createInvitation(
  instituteId: string,
  invitedById: string,
  input: InviteCreateInput,
  actor: InviteActor
): Promise<{ token: string }> {
  const role = await prisma.role.findFirst({
    where: { id: input.roleId, instituteId },
    select: {
      id: true,
      key: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  })
  if (!role) throw new NotFoundError("Role not found.")

  // Block privilege escalation: a non-super-admin can't invite someone into a
  // role more senior than, or holding permissions beyond, their own.
  if (!actor.isSuperAdmin) {
    if (roleWeight(role.key) >= actor.weight) {
      throw new ForbiddenError("You can't assign a role more privileged than your own.")
    }
    const targetKeys = role.permissions.map((p) => p.permission.key)
    const escalating = targetKeys.filter((k) => !actor.permissions.has(k))
    if (escalating.length > 0) {
      throw new ForbiddenError(
        `You can't grant a role with permissions you don't hold yourself: ${escalating.join(", ")}.`
      )
    }
  }

  const alreadyMember = await prisma.membership.findFirst({
    where: { instituteId, user: { email: input.email } },
    select: { id: true },
  })
  if (alreadyMember) {
    throw new ConflictError("That email is already a member of this institute.")
  }

  // Supersede older pending invites for the same person.
  await prisma.invitation.updateMany({
    where: { instituteId, email: input.email, status: "PENDING" },
    data: { status: "REVOKED" },
  })

  const token = randomBytes(24).toString("base64url")
  await prisma.invitation.create({
    data: {
      instituteId,
      email: input.email,
      roleId: input.roleId,
      token,
      invitedById,
      expiresAt: nowPlus({ days: INVITE_TTL_DAYS }),
    },
  })
  return { token }
}

/** A still-valid (pending, unexpired) invite resolved from its token, or null. */
export async function getInvitationPreview(
  token: string
): Promise<InvitationPreview | null> {
  const inv = await prisma.invitation.findFirst({
    where: { token, status: "PENDING", expiresAt: { gt: nowDate() } },
    include: {
      institute: { select: { name: true } },
      role: { select: { name: true } },
    },
  })
  if (!inv) return null
  return {
    email: inv.email,
    instituteName: inv.institute.name,
    roleName: inv.role.name,
  }
}

/** Returns the invited email for a valid token (for the signup call), or throws. */
export async function getInvitationEmail(token: string): Promise<string> {
  const inv = await prisma.invitation.findFirst({
    where: { token, status: "PENDING", expiresAt: { gt: nowDate() } },
    select: { email: true },
  })
  if (!inv) throw new NotFoundError("This invite is invalid or has expired.")
  return inv.email
}

/**
 * Links a freshly-created (or existing) user to the institute named by the
 * invite and consumes the token — atomically. Called after the invitee's
 * identity is created.
 */
export async function acceptInvitation(token: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const inv = await tx.invitation.findFirst({
      where: { token, status: "PENDING", expiresAt: { gt: nowDate() } },
    })
    if (!inv) throw new NotFoundError("This invite is invalid or has expired.")

    const membership = await tx.membership.upsert({
      where: { userId_instituteId: { userId, instituteId: inv.instituteId } },
      create: { userId, instituteId: inv.instituteId, roleId: inv.roleId },
      update: { roleId: inv.roleId },
      include: {
        user: { select: { name: true } },
        role: { select: { name: true } },
      },
    })
    await tx.invitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: nowDate() },
    })
    // Attribute the join to the admin who invited them (the invitee just completed
    // it); reads "{inviter} Added a member" in the activity feed.
    await recordAudit(tx, {
      instituteId: inv.instituteId,
      actorId: inv.invitedById,
      action: AUDIT_ACTIONS.MEMBER_ADD,
      entityType: "Membership",
      entityId: membership.id,
      metadata: {
        userId,
        memberName: membership.user.name,
        role: membership.role.name,
        via: "invite",
      },
    })
  })
}
