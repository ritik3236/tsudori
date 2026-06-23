import "server-only"

import type { Institute } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { InstituteOption, InstituteProfile } from "@/features/institute/types"
import type { InstituteUpdateInput } from "@/features/institute/schema"

/** Every institute a super admin can switch into (ACTIVE or SUSPENDED — they may
 *  enter a suspended one for support). `roleName` is null: a super admin enters
 *  any institute with full permissions, not via a membership role. */
export async function listAllInstitutes(): Promise<InstituteOption[]> {
  const institutes = await prisma.institute.findMany({
    where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, logoUrl: true, status: true },
  })
  return institutes.map((i) => ({ ...i, roleName: null }))
}

// Maps the full Institute record to the editable profile shape. Pure, so the
// settings page can derive it from the tenant context without an extra query.
export function toInstituteProfile(i: Institute): InstituteProfile {
  return {
    id: i.id,
    name: i.name,
    logoUrl: i.logoUrl,
    email: i.email,
    phone: i.phone,
    addressLine: i.addressLine,
  }
}

export async function updateInstitute(
  instituteId: string,
  input: InstituteUpdateInput
): Promise<InstituteProfile> {
  const updated = await prisma.institute.update({
    where: { id: instituteId },
    data: {
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      email: input.email,
      phone: input.phone ?? null,
      addressLine: input.addressLine ?? null,
    },
  })
  return toInstituteProfile(updated)
}
