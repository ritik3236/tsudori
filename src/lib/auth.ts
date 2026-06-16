import "server-only"

import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth/server"
import { UnauthorizedError } from "@/lib/errors"

// Neon Auth (Better Auth) owns authentication and the canonical user record,
// stored in the `neon_auth.user` table. We map that table as the `User` model
// (see prisma/schema.prisma) so domain data can FK to a stable identity. There
// is no mirrored row to maintain: Neon Auth creates the row on sign-up, and we
// simply read it back keyed by the session's user id.

/**
 * Returns the platform User for the signed-in Neon Auth session, or null when
 * there is no active session (or the auth record hasn't synced yet).
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: session } = await auth.getSession()
  const authUserId = session?.user?.id
  if (!authUserId) return null

  return prisma.user.findUnique({ where: { id: authUserId } })
}

/** Same as getCurrentUser but throws when unauthenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}
