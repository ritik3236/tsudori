import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { roleWeight } from "@/lib/rbac"
import { recordAudit, AUDIT_ACTIONS } from "@/features/audit/service"
import type { MemberListItem, RoleOption } from "@/features/members/types"

/**
 * Who is performing a role grant — used to block privilege escalation (mirrors
 * the `Editor` concept in src/features/roles/service.ts). A non-super-admin can
 * only assign roles strictly below their own seniority, and can only grant
 * permissions they already hold themselves. Super admins bypass both checks.
 */
export type RoleGrantActor = {
  /** roleWeight() of the actor's own role. */
  weight: number
  /** The actor's own granted permission keys. */
  permissions: ReadonlySet<string>
  isSuperAdmin: boolean
}

/** Permissions that, if held by a role, make it an institute-admin-grade role. */
const ADMIN_GRADE_PERMISSIONS = ["institute:manage", "role:manage"] as const

/**
 * Enforces the anti-escalation rule for a single role grant: the target role
 * must be strictly below the actor's seniority AND its resolved permission set
 * must be a subset of the actor's own. Super admins are exempt. Throws
 * ForbiddenError when violated.
 */
function assertCanGrantRole(
  actor: RoleGrantActor,
  targetRoleKey: string,
  targetPermissionKeys: string[]
): void {
  if (actor.isSuperAdmin) return
  if (roleWeight(targetRoleKey) >= actor.weight) {
    throw new ForbiddenError("You can't assign a role more privileged than your own.")
  }
  const escalating = targetPermissionKeys.filter((k) => !actor.permissions.has(k))
  if (escalating.length > 0) {
    throw new ForbiddenError(
      `You can't grant a role with permissions you don't hold yourself: ${escalating.join(", ")}.`
    )
  }
}

/** True if the role (by its permission keys) grants an institute-admin-grade permission. */
function isAdminGradeRole(permissionKeys: string[]): boolean {
  return ADMIN_GRADE_PERMISSIONS.some((p) => permissionKeys.includes(p))
}

/**
 * Last-admin guard: throws unless at least one OTHER active member can still
 * administer the institute. "Can administer" = holds an admin-grade role
 * (institute:manage / role:manage) OR is the platform super admin (who holds
 * every permission). Counting the super admin means this only blocks the genuine
 * lockout — removing/demoting the very last member able to manage the institute —
 * rather than firing whenever a tenant happens to be run by the super admin
 * alone. Run inside the mutating transaction so the count can't race with a
 * concurrent removal/demotion. Callers must only invoke this when the affected
 * member is itself admin-grade, so non-admin members can always be managed.
 */
async function assertOtherAdminRemains(
  tx: Prisma.TransactionClient,
  instituteId: string,
  excludeUserId: string
): Promise<void> {
  const otherAdmins = await tx.membership.count({
    where: {
      instituteId,
      status: "ACTIVE",
      userId: { not: excludeUserId },
      OR: [
        { user: { role: "admin" } },
        {
          role: {
            permissions: {
              some: { permission: { key: { in: [...ADMIN_GRADE_PERMISSIONS] } } },
            },
          },
        },
      ],
    },
  })
  if (otherAdmins === 0) {
    throw new ForbiddenError("At least one institute admin must remain.")
  }
}

// Like the other services, every function takes instituteId as its first
// argument — the tenant boundary is explicit and nothing here reads request
// context. The Neon Auth identity calls (create user, set password) are
// admin-plugin operations and live in the route handler, which owns the
// request-scoped session.

// Exported so the cross-tenant platform member list can reuse the exact same
// include + mapping (it adds an institute join on top).
export const MEMBER_INCLUDE = {
  user: true,
  role: true,
} satisfies Prisma.MembershipInclude

type MembershipWithRelations = Prisma.MembershipGetPayload<{
  include: typeof MEMBER_INCLUDE
}>

export function toMemberListItem(m: MembershipWithRelations): MemberListItem {
  return {
    membershipId: m.id,
    userId: m.userId,
    name: m.user.name,
    image: m.user.image,
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
  // The platform super admin is a hidden system account — never surface it in the
  // team list (or anything built from it, like the audit actor filter).
  return rows.map(toMemberListItem).filter((m) => !m.isSuperAdmin)
}

/**
 * The institute's assignable roles (e.g. Institute Admin, Teacher). When `actor`
 * is supplied and isn't a super admin, the list is filtered to only the roles
 * that actor is actually allowed to grant (same seniority + subset rule the
 * server enforces on the grant paths), so the change-role dropdown can't offer
 * a role the server would then reject. Without an actor the full list is
 * returned (backward-compatible for callers that don't thread actor context).
 */
export async function listAssignableRoles(
  instituteId: string,
  actor?: RoleGrantActor
): Promise<RoleOption[]> {
  const roles = await prisma.role.findMany({
    where: { instituteId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  })

  const visible =
    !actor || actor.isSuperAdmin
      ? roles
      : roles.filter((r) => {
          if (roleWeight(r.key) >= actor.weight) return false
          const keys = r.permissions.map((p) => p.permission.key)
          return keys.every((k) => actor.permissions.has(k))
        })

  return visible.map((r) => ({ id: r.id, key: r.key, name: r.name }))
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

/**
 * Protects the platform super admin (Neon Auth role === "admin") from being
 * demoted or removed by institute admins. The super admin's membership is
 * immutable to everyone else — there is no actor who may change it.
 */
async function assertNotSuperAdmin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role === "admin") {
    throw new ForbiddenError("The super admin can't be changed by other admins.")
  }
}

/**
 * Validates that a role belongs to this institute before it can be assigned, and
 * returns its key + resolved permission keys so callers can run the
 * anti-escalation grant check.
 */
export async function assertRoleInInstitute(
  instituteId: string,
  roleId: string
): Promise<{ key: string; permissionKeys: string[] }> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, instituteId },
    select: {
      key: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  })
  if (!role) {
    throw new ValidationError("Pick a role that belongs to this institute.")
  }
  return { key: role.key, permissionKeys: role.permissions.map((p) => p.permission.key) }
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
  roleId: string,
  actor: RoleGrantActor,
  actorId: string,
  reason?: string | null
): Promise<MemberListItem> {
  await assertNotSuperAdmin(userId)
  const targetRole = await assertRoleInInstitute(instituteId, roleId)
  // Block privilege escalation: the actor can't promote anyone into a role more
  // senior than, or holding permissions beyond, their own.
  assertCanGrantRole(actor, targetRole.key, targetRole.permissionKeys)
  const membership = await prisma.membership.findFirst({
    where: { instituteId, userId },
    include: MEMBER_INCLUDE,
  })
  if (!membership) {
    throw new NotFoundError("That user isn't a member of this institute.")
  }
  // The member's CURRENT role — needed to tell a real admin demotion (which the
  // last-admin guard must catch) from an ordinary role change between non-admin
  // roles (which it must NOT block).
  const currentRole = await assertRoleInInstitute(instituteId, membership.roleId)
  return prisma.$transaction(async (tx) => {
    // Last-admin guard: only when this actually demotes an admin-grade member out
    // of admin grade. Counted in-tx to avoid a race with a concurrent change.
    if (
      isAdminGradeRole(currentRole.permissionKeys) &&
      !isAdminGradeRole(targetRole.permissionKeys)
    ) {
      await assertOtherAdminRemains(tx, instituteId, userId)
    }
    const updated = await tx.membership.update({
      where: { id: membership.id },
      data: { roleId },
      include: MEMBER_INCLUDE,
    })
    await recordAudit(tx, {
      instituteId,
      actorId,
      action: AUDIT_ACTIONS.MEMBER_ROLE_CHANGE,
      entityType: "Membership",
      entityId: membership.id,
      metadata: {
        userId,
        memberName: membership.user.name,
        fromRole: membership.role.name,
        toRole: updated.role.name,
        reason: reason || null,
      },
    })
    return toMemberListItem(updated)
  })
}

/**
 * Soft-removes a member: suspends the membership instead of deleting it. Access
 * is revoked immediately (getTenantContext only loads status:"ACTIVE" rows), but
 * the row — and the identity — survive, so the person can be restored and their
 * history keeps an author. They drop out of the active team list into "Removed".
 */
export async function removeMember(
  instituteId: string,
  userId: string,
  actorId: string,
  reason?: string | null
): Promise<void> {
  await assertNotSuperAdmin(userId)
  const membership = await prisma.membership.findFirst({
    where: { instituteId, userId },
    include: MEMBER_INCLUDE,
  })
  if (!membership) {
    throw new NotFoundError("That user isn't a member of this institute.")
  }
  if (membership.status === "SUSPENDED") return // already removed — idempotent
  // Only an admin-grade member triggers the last-admin guard; removing a teacher
  // or other non-admin member must never be blocked.
  const currentRole = await assertRoleInInstitute(instituteId, membership.roleId)
  await prisma.$transaction(async (tx) => {
    // Last-admin guard: don't let the only remaining institute admin be removed,
    // which would lock the tenant out. Counted in-tx to avoid a race.
    if (isAdminGradeRole(currentRole.permissionKeys)) {
      await assertOtherAdminRemains(tx, instituteId, userId)
    }
    await tx.membership.update({
      where: { id: membership.id },
      data: { status: "SUSPENDED" },
    })
    await recordAudit(tx, {
      instituteId,
      actorId,
      action: AUDIT_ACTIONS.MEMBER_REMOVE,
      entityType: "Membership",
      entityId: membership.id,
      metadata: {
        userId,
        memberName: membership.user.name,
        role: membership.role.name,
        reason: reason || null,
      },
    })
  })
}

/** Restores a soft-removed (suspended) member back to ACTIVE, re-granting access. */
export async function restoreMember(
  instituteId: string,
  userId: string,
  actorId: string
): Promise<MemberListItem> {
  const membership = await prisma.membership.findFirst({
    where: { instituteId, userId },
    include: MEMBER_INCLUDE,
  })
  if (!membership) {
    throw new NotFoundError("That user isn't a member of this institute.")
  }
  if (membership.status === "ACTIVE") return toMemberListItem(membership) // already active — idempotent
  return prisma.$transaction(async (tx) => {
    const updated = await tx.membership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE" },
      include: MEMBER_INCLUDE,
    })
    await recordAudit(tx, {
      instituteId,
      actorId,
      action: AUDIT_ACTIONS.MEMBER_RESTORE,
      entityType: "Membership",
      entityId: membership.id,
      metadata: {
        userId,
        memberName: membership.user.name,
        role: membership.role.name,
      },
    })
    return toMemberListItem(updated)
  })
}
