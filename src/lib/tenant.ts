import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import { forbidden } from "next/navigation"
import type { Institute, Membership, Prisma, Role, User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { nowDate } from "@/lib/date-helper"
import { ForbiddenError } from "@/lib/errors"
import {
  ADMIN_PERMISSIONS,
  ALL_PERMISSIONS,
  hasPermission,
  ROLE_KEYS,
  type Permission,
} from "@/lib/rbac"

export const ACTIVE_INSTITUTE_COOKIE = "tsudori.active_institute"

/**
 * Everything a request needs to act within one tenant. `instituteId` is the
 * scoping key threaded into every service call; `permissions` is the resolved
 * allow-list for the current user in this institute.
 */
export type TenantContext = {
  user: User
  institute: Institute
  membership: (Membership & { role: Role }) | null
  permissions: ReadonlySet<Permission>
  isSuperAdmin: boolean
}

// Fold the active role's permissions into the membership fetch so resolving a
// tenant context costs ONE round trip here instead of a second query. Shared by
// both membership lookups so they can't drift. `satisfies` keeps the literal
// shape, so Prisma still infers role.permissions[].permission on the result.
const MEMBERSHIP_INCLUDE = {
  role: { include: { permissions: { include: { permission: true } } } },
  institute: true,
} satisfies Prisma.MembershipInclude

/**
 * Resolves the active institute for the signed-in user and loads their effective
 * permissions. Order of resolution:
 *   1. The institute named by the active-institute cookie (if the user belongs to it).
 *   2. The user's first active membership.
 *   3. For a super admin with no memberships, the first institute on the platform.
 * Throws ForbiddenError when no institute can be resolved.
 */
// cache()-wrapped: the (dashboard) layout AND the page both call this in the same
// request. Without caching, the full auth → membership → permissions query chain
// would run twice per page load; cache() makes it run once.
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  let user = await requireUser()

  // Identity-level revocation gate. requireUser() re-reads the User row from the
  // DB every request, so this catches a ban even while the signed session_data
  // cookie still caches a stale (unbanned) session upstream — closing the ≤24h
  // window. Applied to EVERYONE, including super admins, and before any
  // permission/super-admin handling so a banned super admin is locked out too.
  // banExpires === null means a permanent ban; a future banExpires is still
  // active; a past one has lapsed.
  if (
    user.banned === true &&
    (user.banExpires === null || user.banExpires > nowDate())
  ) {
    throw new ForbiddenError("Your account has been suspended.")
  }

  let memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: MEMBERSHIP_INCLUDE,
    orderBy: { createdAt: "asc" },
  })

  // First-run bootstrap: link the configured admin email to the seeded institute
  // so the very first sign-in is immediately usable, with no manual DB editing.
  if (memberships.length === 0) {
    const bootstrapped = await maybeBootstrapAdmin(user)
    if (bootstrapped) {
      user = await requireUser() // refresh the promoted role
      memberships = await prisma.membership.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        include: MEMBERSHIP_INCLUDE,
        orderBy: { createdAt: "asc" },
      })
    }
  }

  // Platform super-admin is carried by Neon Auth's (Better Auth) role column.
  const isSuperAdmin = user.role === "admin"

  const cookieStore = await cookies()
  const preferredId = cookieStore.get(ACTIVE_INSTITUTE_COOKIE)?.value

  const active =
    memberships.find((m) => m.instituteId === preferredId) ?? memberships[0]

  if (active) {
    const { institute, ...membership } = active

    // Tenant-level gate: a suspended institute grants no access to its members.
    // Super admins may still enter for support/recovery.
    if (institute.status !== "ACTIVE" && !isSuperAdmin) {
      throw new ForbiddenError("This institute has been suspended.")
    }

    const permissions = isSuperAdmin
      ? new Set<Permission>(ALL_PERMISSIONS)
      : new Set<Permission>(
          membership.role.permissions.map(
            (rp) => rp.permission.key as Permission
          )
        )

    return {
      user,
      institute,
      membership,
      permissions,
      isSuperAdmin,
    }
  }

  // Super admin onboarding fallback: no membership yet, but should still see data.
  if (isSuperAdmin) {
    const institute = await prisma.institute.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    })
    if (institute) {
      return {
        user,
        institute,
        membership: null,
        permissions: new Set<Permission>(ALL_PERMISSIONS),
        isSuperAdmin: true,
      }
    }
  }

  throw new ForbiddenError(
    "Your account isn't linked to an institute yet. Ask an admin for an invite."
  )
})

/**
 * If the signed-in user's email matches BOOTSTRAP_ADMIN_EMAIL and no admin is
 * linked yet, promote them to super admin (Neon Auth `role = "admin"`) and grant
 * Institute Admin on the first institute. Idempotent and a no-op once linked.
 */
async function maybeBootstrapAdmin(user: User): Promise<boolean> {
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase()
  if (!bootstrapEmail || user.email.toLowerCase() !== bootstrapEmail) return false

  const institute = await prisma.institute.findFirst({
    orderBy: { createdAt: "asc" },
  })
  if (!institute) return false

  const adminRole = await prisma.role.findFirst({
    where: { instituteId: institute.id, key: ROLE_KEYS.INSTITUTE_ADMIN },
  })
  if (!adminRole) return false

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { role: "admin" },
    }),
    prisma.membership.upsert({
      where: { userId_instituteId: { userId: user.id, instituteId: institute.id } },
      create: { userId: user.id, instituteId: institute.id, roleId: adminRole.id },
      update: {},
    }),
  ])
  return true
}

/** Guards a server action / route. Throws ForbiddenError when the permission is missing. */
export function requirePermission(
  ctx: TenantContext,
  permission: Permission
): void {
  if (!hasPermission(ctx.permissions, permission)) {
    throw new ForbiddenError()
  }
}

/**
 * Page-only permission guard. Unlike requirePermission — which throws a
 * ForbiddenError for the API layer (src/lib/api.ts) to turn into a 403 JSON
 * envelope — this triggers Next's forbidden() interrupt so the visitor lands on
 * the friendly forbidden.tsx (403) page instead of a raw "server error" screen.
 *
 * Use this in `page.tsx` / `layout.tsx` server components ONLY. In route
 * handlers and server actions that return data, keep using requirePermission.
 */
export function requirePagePermission(
  ctx: TenantContext,
  permission: Permission
): void {
  if (!hasPermission(ctx.permissions, permission)) {
    forbidden()
  }
}

/** Non-throwing variant for conditional UI/logic. */
export function can(ctx: TenantContext, permission: Permission): boolean {
  return hasPermission(ctx.permissions, permission)
}

/**
 * Can the viewer enter the /admin area? Permission-gated (not a single role): the
 * platform super admin, or anyone holding ANY admin permission. Each admin page
 * then enforces its own specific permission, so partial-admin roles see only the
 * areas they're granted.
 */
export function canAccessAdmin(ctx: TenantContext): boolean {
  return ctx.isSuperAdmin || ADMIN_PERMISSIONS.some((p) => ctx.permissions.has(p))
}

/** Page-only admin guard — forbidden() unless the viewer can access /admin. */
export function requireAdminPage(ctx: TenantContext): void {
  if (!canAccessAdmin(ctx)) forbidden()
}
