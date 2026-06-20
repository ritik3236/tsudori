import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { ACTIVE_INSTITUTE_COOKIE } from "@/lib/tenant"
import { getUserAppearance, getInstituteAppearance } from "./service"

export const DEFAULT_THEME = "light"
export const DEFAULT_FONT = "geist"

/**
 * Effective appearance for the current request, resolved per field:
 *   user preference → institute default → app default.
 * cache()-wrapped so the root layout pays for it once per render. Signed-out
 * requests get the app defaults (one cached session check, no extra queries).
 */
export const resolveEffectiveAppearance = cache(
  async (): Promise<{ theme: string; font: string }> => {
    const user = await getCurrentUser()
    if (!user) return { theme: DEFAULT_THEME, font: DEFAULT_FONT }

    const pref = await getUserAppearance(user.id)
    let theme = pref?.theme ?? null
    let font = pref?.font ?? null

    // Institute default fills any field the user hasn't personally set.
    if (theme === null || font === null) {
      const instituteId = await activeInstituteId(user.id)
      if (instituteId) {
        const inst = await getInstituteAppearance(instituteId)
        theme = theme ?? inst?.theme ?? null
        font = font ?? inst?.font ?? null
      }
    }

    return { theme: theme ?? DEFAULT_THEME, font: font ?? DEFAULT_FONT }
  }
)

// The institute to inherit defaults from: the active-institute cookie (if the
// user still belongs to it), else their first active membership. Lightweight
// (id only) — mirrors getTenantContext's resolution without the full load.
async function activeInstituteId(userId: string): Promise<string | null> {
  const preferred = (await cookies()).get(ACTIVE_INSTITUTE_COOKIE)?.value
  if (preferred) {
    const m = await prisma.membership.findFirst({
      where: { userId, instituteId: preferred, status: "ACTIVE" },
      select: { instituteId: true },
    })
    if (m) return m.instituteId
  }
  const first = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { instituteId: true },
  })
  return first?.instituteId ?? null
}
