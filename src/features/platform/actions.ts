"use server"

import { revalidatePath } from "next/cache"
import type { InstituteStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import { getSuperAdminContext } from "@/lib/tenant"
import { AUDIT_ACTIONS, recordAudit } from "@/features/audit/service"
import { instituteCreateSchema } from "@/features/platform/schema"
import { createInstitute, type PlatformInstituteRow } from "@/features/platform/service"

/** Create a new institute (super-admin only). Returns the new list row; the
 *  caller stays on /platform/institutes — creating an institute doesn't enter it. */
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
