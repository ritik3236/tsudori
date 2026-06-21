import "server-only"

import { randomBytes } from "node:crypto"

import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/errors"
import { nowDate, nowPlus } from "@/lib/date-helper"
import type { InviteCreateInput } from "@/features/invitations/schema"
import type { InvitationPreview } from "@/features/invitations/types"

const INVITE_TTL_DAYS = 7

/**
 * Creates a pending invite for `email` to join `instituteId` with `roleId` and
 * returns its token. The admin shares the resulting /invite/<token> link. Any
 * earlier pending invite for the same email+institute is revoked so only the
 * latest link is valid.
 */
export async function createInvitation(
  instituteId: string,
  invitedById: string,
  input: InviteCreateInput
): Promise<{ token: string }> {
  const role = await prisma.role.findFirst({
    where: { id: input.roleId, instituteId },
    select: { id: true },
  })
  if (!role) throw new NotFoundError("Role not found.")

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

    await tx.membership.upsert({
      where: { userId_instituteId: { userId, instituteId: inv.instituteId } },
      create: { userId, instituteId: inv.instituteId, roleId: inv.roleId },
      update: { roleId: inv.roleId },
    })
    await tx.invitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: nowDate() },
    })
  })
}
