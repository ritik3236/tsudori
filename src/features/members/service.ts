import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/errors"
import type { MemberListItem, RoleOption } from "@/features/members/types"

// Like the other services, every function takes instituteId as its first
// argument — the tenant boundary is explicit and nothing here reads request
// context. The Neon Auth identity calls (create user, set password) are
// admin-plugin operations and live in the route handler, which owns the
// request-scoped session.

const MEMBER_INCLUDE = {
  user: true,
  role: true,
} satisfies Prisma.MembershipInclude

type MembershipWithRelations = Prisma.MembershipGetPayload<{
  include: typeof MEMBER_INCLUDE
}>

function toMemberListItem(m: MembershipWithRelations): MemberListItem {
  return {
    membershipId: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    emailVerified: m.user.emailVerified,
    roleId: m.roleId,
    roleName: m.role.name,
    roleKey: m.role.key,
    status: m.status,
    isSuperAdmin: m.user.role === "admin",
    banned: m.user.banned ?? false,
    banReason: m.user.banReason ?? null,
    joinedAt: m.createdAt.toISOString(),
  }
}

export async function listMembers(instituteId: string): Promise<MemberListItem[]> {
  const rows = await prisma.membership.findMany({
    where: { instituteId },
    include: MEMBER_INCLUDE,
    orderBy: { createdAt: "asc" },
  })
  return rows.map(toMemberListItem)
}

/** The institute's assignable roles (e.g. Institute Admin, Teacher). */
export async function listAssignableRoles(instituteId: string): Promise<RoleOption[]> {
  return prisma.role.findMany({
    where: { instituteId },
    orderBy: { name: "asc" },
    select: { id: true, key: true, name: true },
  })
}

/**
 * Tenant guard for member-scoped actions: throws unless the user is a member of
 * this institute. Keeps a super admin's reach scoped to the institute in view
 * rather than any user on the platform.
 */
export async function assertMemberInInstitute(
  instituteId: string,
  userId: string
): Promise<void> {
  const membership = await prisma.membership.findFirst({
    where: { instituteId, userId },
    select: { id: true },
  })
  if (!membership) {
    throw new NotFoundError("That user isn't a member of this institute.")
  }
}

/** Validates that a role belongs to this institute before it can be assigned. */
export async function assertRoleInInstitute(
  instituteId: string,
  roleId: string
): Promise<void> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, instituteId },
    select: { id: true },
  })
  if (!role) {
    throw new ValidationError("Pick a role that belongs to this institute.")
  }
}

/**
 * Links a (freshly created) Neon Auth user to this institute with the given
 * role. Upsert keeps it idempotent if the membership somehow already exists.
 * Returns the resulting member row for the API response.
 */
export async function addMembership(
  instituteId: string,
  userId: string,
  roleId: string
): Promise<MemberListItem> {
  const membership = await prisma.membership.upsert({
    where: { userId_instituteId: { userId, instituteId } },
    create: { userId, instituteId, roleId },
    update: { roleId, status: "ACTIVE" },
    include: MEMBER_INCLUDE,
  })
  return toMemberListItem(membership)
}

/** Reads a single member row (used to return the fresh state after a ban/unban). */
export async function getMember(
  instituteId: string,
  userId: string
): Promise<MemberListItem> {
  const membership = await prisma.membership.findFirst({
    where: { instituteId, userId },
    include: MEMBER_INCLUDE,
  })
  if (!membership) {
    throw new NotFoundError("That user isn't a member of this institute.")
  }
  return toMemberListItem(membership)
}

/** Changes a member's institute role. */
export async function updateMemberRole(
  instituteId: string,
  userId: string,
  roleId: string
): Promise<MemberListItem> {
  await assertRoleInInstitute(instituteId, roleId)
  const membership = await prisma.membership.findFirst({
    where: { instituteId, userId },
    select: { id: true },
  })
  if (!membership) {
    throw new NotFoundError("That user isn't a member of this institute.")
  }
  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: { roleId },
    include: MEMBER_INCLUDE,
  })
  return toMemberListItem(updated)
}

/** Removes a member from the institute (deletes the membership; keeps the identity). */
export async function removeMember(
  instituteId: string,
  userId: string
): Promise<void> {
  const membership = await prisma.membership.findFirst({
    where: { instituteId, userId },
    select: { id: true },
  })
  if (!membership) {
    throw new NotFoundError("That user isn't a member of this institute.")
  }
  await prisma.membership.delete({ where: { id: membership.id } })
}
