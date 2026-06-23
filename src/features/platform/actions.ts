"use server"

import { revalidatePath } from "next/cache"
import type { InstituteStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth/server"
import { AppError, ConflictError, NotFoundError } from "@/lib/errors"
import { getSuperAdminContext } from "@/lib/tenant"
import { AUDIT_ACTIONS, recordAudit } from "@/features/audit/service"
import {
  instituteCreateSchema,
  type InstituteCreateInput,
} from "@/features/platform/schema"
import { createInstitute, type PlatformInstituteRow } from "@/features/platform/service"
import { memberCreateSchema, type MemberCreateInput } from "@/features/members/schema"
import { addMembership, assertRoleInInstitute } from "@/features/members/service"
import type { MemberListItem } from "@/features/members/types"

/**
 * Provisions a Neon Auth login (super-admin-only admin plugin). Throws a clean
 * ConflictError on a taken email so callers can surface it. Returns the new
 * user's id. Shared by institute-create (first admin) and add-member.
 */
async function createAuthUser(input: {
  name: string
  email: string
  password: string
}): Promise<string> {
  const { data, error } = await auth.admin.createUser(input)
  if (error) {
    if (/exist/i.test(error.message || "")) {
      throw new ConflictError("A user with that email already exists.")
    }
    throw new AppError(
      error.message || "Couldn't create the account.",
      typeof error.status === "number" ? error.status : 502,
      "AUTH_ERROR"
    )
  }
  return data.user.id
}

/**
 * Create a new institute and its first admin in one step (super-admin only).
 * Identity-first: the admin's login is created before anything is written, so a
 * taken email fails with nothing left behind. Returns the new list row; the
 * caller stays on /platform/institutes — creating an institute doesn't enter it.
 */
export async function createInstituteAction(
  input: InstituteCreateInput
): Promise<PlatformInstituteRow> {
  const ctx = await getSuperAdminContext()
  const data = instituteCreateSchema.parse(input)

  const adminUserId = await createAuthUser({
    name: data.adminName,
    email: data.adminEmail,
    password: data.adminPassword,
  })

  const row = await createInstitute(ctx, { name: data.name, adminUserId })
  revalidatePath("/platform/institutes")
  revalidatePath("/platform")
  return row
}

/**
 * Add a member (real login + membership) to an existing institute from its
 * platform detail page (super-admin only) — the "after" path for institutes that
 * need more staff beyond the first admin. Mirrors POST /api/members but targets
 * an explicit institute rather than the active tenant.
 */
export async function addInstituteMemberAction(
  instituteId: string,
  input: MemberCreateInput
): Promise<MemberListItem> {
  await getSuperAdminContext() // gate: throws for non-super-admins
  const data = memberCreateSchema.parse(input)

  // Role must belong to this institute (a super admin may grant any of them).
  await assertRoleInInstitute(instituteId, data.roleId)

  const userId = await createAuthUser({
    name: data.name,
    email: data.email,
    password: data.password,
  })

  const member = await addMembership(instituteId, userId, data.roleId)
  revalidatePath(`/platform/institutes/${instituteId}`)
  revalidatePath("/platform/institutes")
  revalidatePath("/platform")
  return member
}

/** Suspend or reactivate an institute (super-admin only). A suspended institute
 *  blocks its normal members on their next request; super admins may still enter. */
export async function setInstituteStatus(
  instituteId: string,
  status: InstituteStatus
): Promise<void> {
  const ctx = await getSuperAdminContext()

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true, status: true },
  })
  if (!institute) throw new NotFoundError("Institute not found.")
  if (institute.status === status) return // no-op — safe re-click

  await prisma.$transaction(async (tx) => {
    await tx.institute.update({ where: { id: instituteId }, data: { status } })
    await recordAudit(tx, {
      instituteId,
      actorId: ctx.user.id,
      action:
        status === "SUSPENDED"
          ? AUDIT_ACTIONS.INSTITUTE_SUSPEND
          : AUDIT_ACTIONS.INSTITUTE_REACTIVATE,
      entityType: "Institute",
      entityId: instituteId,
      metadata: { from: institute.status, to: status },
    })
  })

  revalidatePath("/platform/institutes")
  revalidatePath("/platform")
}
