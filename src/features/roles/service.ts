import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { roleWeight } from "@/lib/rbac"
import { recordAudit, AUDIT_ACTIONS } from "@/features/audit/service"
import type { RolePermissions, RolesData } from "@/features/roles/types"
import type { UpdateRolePermissionsInput } from "@/features/roles/schema"

// Roles and their permissions live in the DB (Role / Permission / RolePermission),
// so editing them is data, not code — no redeployment. Permission *keys* are still
// defined in code (src/lib/rbac.ts) and enforced at the route guards; this screen
// only changes which existing keys each role holds.

/** Who is making the request — used to enforce role seniority and prevent
 *  privilege escalation. Super admins bypass all of it. */
type Editor = {
  roleId: string | null
  /** roleWeight() of the editor's own role. */
  weight: number
  /** The editor's own granted permission keys. */
  permissions: ReadonlySet<string>
  isSuperAdmin: boolean
}

type RoleWithPermissions = {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: { permission: { key: string } }[]
}

function toRolePermissions(r: RoleWithPermissions, editable: boolean): RolePermissions {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissionKeys: r.permissions.map((p) => p.permission.key),
    editable,
  }
}

/** A non-super-admin may only edit roles strictly below their own seniority. */
function canEdit(editor: Editor, roleKey: string): boolean {
  return editor.isSuperAdmin || roleWeight(roleKey) < editor.weight
}

export async function getRolesAndPermissions(
  instituteId: string,
  editor: Editor
): Promise<RolesData> {
  const [roles, catalog] = await Promise.all([
    prisma.role.findMany({
      where: { instituteId },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permission: { select: { key: true } } } },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { key: "asc" }],
      select: { key: true, module: true, description: true },
    }),
  ])

  // Heaviest (most privileged) role first; custom roles fall back to breadth of
  // access, then name, so the order is stable.
  const sortedRoles = roles
    .map((r) => toRolePermissions(r, canEdit(editor, r.key)))
    .sort(
      (a, b) =>
        roleWeight(b.key) - roleWeight(a.key) ||
        b.permissionKeys.length - a.permissionKeys.length ||
        a.name.localeCompare(b.name)
    )

  return {
    roles: sortedRoles,
    catalog,
    currentRoleId: editor.roleId,
    isSuperAdmin: editor.isSuperAdmin,
  }
}

/**
 * Replaces a role's permission set with the given keys. Scoped to the institute's
 * own roles. Enforces seniority so the screen can't be used to escalate privilege:
 * a non-super-admin can only edit roles below their own weight (so never their own
 * or a more-privileged role), and can only grant permissions they already hold.
 * Super admins bypass these checks.
 */
export async function updateRolePermissions(
  instituteId: string,
  roleId: string,
  input: UpdateRolePermissionsInput,
  editor: Editor,
  actorId: string
): Promise<RolePermissions> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, instituteId },
    select: { id: true, key: true, name: true },
  })
  if (!role) throw new NotFoundError("Role not found.")

  const requested = Array.from(new Set(input.permissions))

  // Only real, known permission keys can be granted.
  const known = await prisma.permission.findMany({
    where: { key: { in: requested } },
    select: { id: true, key: true },
  })
  if (known.length !== requested.length) {
    const valid = new Set(known.map((p) => p.key))
    const unknown = requested.filter((k) => !valid.has(k))
    throw new ValidationError(`Unknown permission(s): ${unknown.join(", ")}.`)
  }

  if (!editor.isSuperAdmin) {
    if (!canEdit(editor, role.key)) {
      throw new ForbiddenError(
        "You can only edit roles below your own seniority."
      )
    }
    const escalating = requested.filter((k) => !editor.permissions.has(k))
    if (escalating.length > 0) {
      throw new ForbiddenError(
        `You can't grant permissions you don't hold yourself: ${escalating.join(", ")}.`
      )
    }
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: known.map((p) => ({ roleId, permissionId: p.id })),
    }),
    recordAudit(prisma, {
      instituteId,
      actorId,
      action: AUDIT_ACTIONS.ROLE_PERMISSIONS_CHANGE,
      entityType: "Role",
      entityId: roleId,
      metadata: { roleName: role.name, roleKey: role.key, permissions: requested },
    }),
  ])

  const updated = await prisma.role.findFirstOrThrow({
    where: { id: roleId },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  })
  return toRolePermissions(updated, canEdit(editor, updated.key))
}
