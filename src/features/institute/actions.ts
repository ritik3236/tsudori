"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { ACTIVE_INSTITUTE_COOKIE, getTenantContext } from "@/lib/tenant"
import { AUDIT_ACTIONS } from "@/features/audit/service"

/**
 * Switch the active institute. A normal user may only switch to one they belong
 * to; a super admin may enter any existing institute (ACTIVE or SUSPENDED, for
 * support). Sets the active-institute cookie — read server-side by
 * getTenantContext — then redirects to /dashboard so the tenant re-resolves from
 * scratch (also avoids landing on a deep page that doesn't exist in the new
 * tenant). The cookie is httpOnly: it's only ever read on the server.
 */
export async function setActiveInstitute(instituteId: string): Promise<void> {
  const ctx = await getTenantContext()

  const viaMembership = ctx.myInstitutes.some((i) => i.id === instituteId)
  const isCurrent = instituteId === ctx.institute.id

  // Authorize: a non-member institute is only reachable by a super admin, and
  // only if it actually exists. (The current institute is already authorized.)
  if (!viaMembership && !isCurrent) {
    if (!ctx.isSuperAdmin) throw new ForbiddenError()
    const target = await prisma.institute.findFirst({
      where: { id: instituteId, status: { in: ["ACTIVE", "SUSPENDED"] } },
      select: { id: true },
    })
    if (!target) throw new NotFoundError("Institute not found.")
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_INSTITUTE_COOKIE, instituteId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // a year — remember the choice
  })

  // Audit a real switch (not the picker pinning the current institute). Logs
  // super-admin entry into a non-member institute, scoped to the destination.
  if (!isCurrent) {
    await prisma.auditLog.create({
      data: {
        instituteId,
        actorId: ctx.user.id,
        action: AUDIT_ACTIONS.INSTITUTE_SWITCH,
        entityType: "Institute",
        entityId: instituteId,
        metadata: {
          from: ctx.institute.id,
          isSuperAdmin: ctx.isSuperAdmin,
          viaMembership,
        },
      },
    })
  }

  redirect("/dashboard")
}
