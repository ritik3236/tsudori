"use server"

import { revalidatePath } from "next/cache"
import type { InstituteStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth/server"
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors"
import { getSuperAdminContext } from "@/lib/tenant"
import { AUDIT_ACTIONS, recordAudit } from "@/features/audit/service"
import {
  instituteCreateSchema,
  instituteMemberAddSchema,
  type InstituteMemberAddInput,
} from "@/features/platform/schema"
import {
  createInstitute,
  lookupInstituteMember,
  type InstituteMemberLookup,
  type PlatformInstituteRow,
} from "@/features/platform/service"
import { MIN_PASSWORD_LENGTH } from "@/features/members/schema"
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

/** Create a new institute (super-admin only). Returns the new list row; the
 *  caller stays on /platform/institutes — creating an institute doesn't enter it.
 *  Members (including the first admin) are assigned from the institute's detail
 *  page via addInstituteMemberAction. */
export async function createInstituteAction(
  name: string
): Promise<PlatformInstituteRow> {
  const ctx = await getSuperAdminContext()
  const input = instituteCreateSchema.parse({ name })
  const row = await createInstitute(ctx, input)
  revalidatePath("/platform/institutes")
  revalidatePath("/platform")
  return row
}

/** Resolve an email for the add-member dialog (super-admin only): a brand-new
 *  person, an existing login to attach, or someone already a member here. */
export async function lookupInstituteMemberAction(
  instituteId: string,
  email: string
): Promise<InstituteMemberLookup> {
  const ctx = await getSuperAdminContext()
  return lookupInstituteMember(ctx, instituteId, email)
}

/**
 * Add a member to an existing institute from its platform detail page (super-admin
 * only). Email is the identity: an existing login is just attached — so one person
 * can belong to several institutes with a single login — while a new email
 * provisions a login (name + password required). Re-adding someone already in this
 * institute is blocked.
 */
export async function addInstituteMemberAction(
  instituteId: string,
  input: InstituteMemberAddInput
): Promise<MemberListItem> {
  await getSuperAdminContext() // gate: throws for non-super-admins
  const data = instituteMemberAddSchema.parse(input)

  // Role must belong to this institute (a super admin may grant any of them).
  await assertRoleInInstitute(instituteId, data.roleId)

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  })

  let userId: string
  if (existing) {
    // Attach an existing login. Guard the re-add so "Add" never silently changes
    // someone's existing role here (that's what change-role is for).
    const dup = await prisma.membership.findUnique({
      where: { userId_instituteId: { userId: existing.id, instituteId } },
      select: { id: true },
    })
    if (dup) throw new ConflictError("They're already a member of this institute.")
    userId = existing.id
  } else {
    // New person — name + password required (the dialog reveals those fields only
    // once the email is found to be new; re-checked here as the server contract).
    if (!data.name || !data.password || data.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Enter a name and a password of at least ${MIN_PASSWORD_LENGTH} characters.`
      )
    }
    userId = await createAuthUser({
      name: data.name,
      email: data.email,
      password: data.password,
    })
  }

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
