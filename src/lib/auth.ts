import "server-only"

import { cache } from "react"
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
// cache() dedupes within a single server request: the layout and the page both
// resolve auth, but the session lookup + user query run only once.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { data: session } = await auth.getSession()
  const authUserId = session?.user?.id
  if (!authUserId) return null

  return prisma.user.findUnique({ where: { id: authUserId } })
})

/** Same as getCurrentUser but throws when unauthenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}
