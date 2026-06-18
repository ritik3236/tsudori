// Data-driven RBAC. Permissions are the unit of authorization; roles are bundles
// of permissions stored in the DB. This file is the single source of truth that
// the seed script writes into the Role/Permission tables, and that runtime checks
// read back. Adding a capability = add a key here + re-seed; no code branching.

export const PERMISSION_MODULES = [
  "student",
  "attendance",
  "fee",
  "class",
  "report",
  "institute",
  "member",
  "role",
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

/** Every capability in the platform. `module:action` convention. */
export const PERMISSIONS = {
  STUDENT_READ: "student:read",
  STUDENT_CREATE: "student:create",
  STUDENT_UPDATE: "student:update",
  STUDENT_ARCHIVE: "student:archive",

  ATTENDANCE_READ: "attendance:read",
  ATTENDANCE_MARK: "attendance:mark",

  FEE_READ: "fee:read",
  FEE_RECORD: "fee:record",
  FEE_WAIVE: "fee:waive",
  FEE_CONFIGURE: "fee:configure",

  CLASS_READ: "class:read",
  CLASS_MANAGE: "class:manage",

  REPORT_VIEW: "report:view",

  INSTITUTE_READ: "institute:read",
  INSTITUTE_MANAGE: "institute:manage",

  MEMBER_READ: "member:read",
  MEMBER_MANAGE: "member:manage",

  ROLE_MANAGE: "role:manage",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)

// Holding ANY of these grants entry to the /admin area; each admin page then
// enforces its own specific permission. Lets you build partial-admin roles
// (e.g. an "Accountant" with only fee:configure sees just Fees configuration).
export const ADMIN_PERMISSIONS: Permission[] = [
  PERMISSIONS.INSTITUTE_READ,
  PERMISSIONS.INSTITUTE_MANAGE,
  PERMISSIONS.MEMBER_READ,
  PERMISSIONS.MEMBER_MANAGE,
  PERMISSIONS.ROLE_MANAGE,
  PERMISSIONS.FEE_CONFIGURE,
]

/** Maps a permission key back to its module, for building permission matrices. */
export function permissionModule(permission: Permission): PermissionModule {
  return permission.split(":")[0] as PermissionModule
}

// ─── System role templates ───────────────────────────────────────────────────
// Seeded once. The `key` is stable and referenced in code; names/permissions are
// data and can be customised per institute later without touching this file.

export const ROLE_KEYS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  INSTITUTE_ADMIN: "INSTITUTE_ADMIN",
  TEACHER: "TEACHER",
  AUDITOR: "AUDITOR",
} as const

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS]

type RoleTemplate = {
  key: RoleKey
  name: string
  description: string
  /** "*" grants every permission; otherwise an explicit allow-list. */
  permissions: Permission[] | "*"
}

export const SYSTEM_ROLES: RoleTemplate[] = [
  {
    key: ROLE_KEYS.SUPER_ADMIN,
    name: "Super Admin",
    description: "Platform owner. Full access across all institutes.",
    permissions: "*",
  },
  {
    key: ROLE_KEYS.INSTITUTE_ADMIN,
    name: "Institute Admin",
    description: "Owner/manager of an institute. Full access within their institute.",
    permissions: "*",
  },
  {
    key: ROLE_KEYS.TEACHER,
    name: "Teacher / Staff",
    description: "Marks attendance and views students; no fee or settings access.",
    permissions: [
      PERMISSIONS.STUDENT_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.ATTENDANCE_MARK,
      PERMISSIONS.CLASS_READ,
      PERMISSIONS.REPORT_VIEW,
    ],
  },
  {
    key: ROLE_KEYS.AUDITOR,
    name: "Auditor",
    description:
      "Read-only access across the institute — view students, attendance, fees, classes, members, and reports; change nothing.",
    permissions: [
      PERMISSIONS.STUDENT_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.FEE_READ,
      PERMISSIONS.CLASS_READ,
      PERMISSIONS.MEMBER_READ,
      PERMISSIONS.REPORT_VIEW,
    ],
  },
]

export function resolveRolePermissions(template: RoleTemplate): Permission[] {
  return template.permissions === "*" ? ALL_PERMISSIONS : template.permissions
}

/**
 * Sort weight (seniority) for roles — higher = more privileged, shown first.
 * Custom roles aren't in this map; callers fall back to breadth-of-access
 * (permission count) so they still order sensibly.
 */
export const ROLE_WEIGHTS: Record<string, number> = {
  [ROLE_KEYS.SUPER_ADMIN]: 100,
  [ROLE_KEYS.INSTITUTE_ADMIN]: 80,
  [ROLE_KEYS.TEACHER]: 40,
  [ROLE_KEYS.AUDITOR]: 20,
}

export function roleWeight(key: string): number {
  return ROLE_WEIGHTS[key] ?? 0
}

/** Pure check used by both server guards and UI gating. */
export function hasPermission(
  granted: ReadonlySet<string>,
  required: Permission
): boolean {
  return granted.has(required)
}
