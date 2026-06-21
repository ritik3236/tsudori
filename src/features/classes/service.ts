import "server-only"

import { cache } from "react"
import type { Class } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/errors"
import type { ClassListItem } from "@/features/classes/types"
import { normalizeClassKey } from "@/features/classes/schema"
import type { ClassCreateInput, ClassUpdateInput } from "@/features/classes/schema"

// Natural, case-insensitive ordering so "Class 2" sorts before "Class 10" and
// sections group together ("Grade 5 / A" then "Grade 5 / B").
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
function compareClasses(a: ClassListItem, b: ClassListItem): number {
  return collator.compare(a.name, b.name) || collator.compare(a.section, b.section)
}

// cache()-wrapped: the class detail route calls this in both generateMetadata
// AND the page body. Without memoization that's two identical queries per
// request; cache() collapses them to one.
export const getClass = cache(
  async (instituteId: string, id: string): Promise<ClassListItem> => {
    const cls = await prisma.class.findFirst({
      where: { id, instituteId },
      include: { _count: { select: { students: { where: { archivedAt: null } } } } },
    })
    if (!cls) throw new NotFoundError("Class not found.")
    return toListItem(cls)
  }
)

export async function listClasses(instituteId: string): Promise<ClassListItem[]> {
  const rows = await prisma.class.findMany({
    where: { instituteId },
    include: { _count: { select: { students: { where: { archivedAt: null } } } } },
  })
  return rows.map(toListItem).sort(compareClasses)
}

export async function createClass(
  instituteId: string,
  input: ClassCreateInput
): Promise<ClassListItem> {
  const nameKey = normalizeClassKey(input.name, input.section)
  const existing = await prisma.class.findFirst({
    where: { instituteId, nameKey },
    select: { id: true },
  })
  if (existing) {
    throw new ConflictError(`A class "${input.name} / ${input.section}" already exists.`)
  }

  const cls = await prisma.class.create({
    data: {
      instituteId,
      name: input.name,
      section: input.section,
      nameKey,
      defaultMonthlyFee: input.defaultMonthlyFee,
      status: input.status,
    },
    include: { _count: { select: { students: { where: { archivedAt: null } } } } },
  })
  return toListItem(cls)
}

export async function updateClass(
  instituteId: string,
  id: string,
  input: ClassUpdateInput
): Promise<ClassListItem> {
  const existing = await prisma.class.findFirst({ where: { id, instituteId } })
  if (!existing) throw new NotFoundError("Class not found.")

  // Recompute the identity key from the effective (name, section) and re-check
  // for a clash only when either part actually changed.
  const nextName = input.name ?? existing.name
  const nextSection = input.section ?? existing.section
  const nameKey = normalizeClassKey(nextName, nextSection)
  const identityChanged = nameKey !== existing.nameKey
  if (identityChanged) {
    const conflict = await prisma.class.findFirst({
      where: { instituteId, nameKey, id: { not: id } },
      select: { id: true },
    })
    if (conflict) {
      throw new ConflictError(`A class "${nextName} / ${nextSection}" already exists.`)
    }
  }

  const cls = await prisma.class.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.section !== undefined && { section: input.section }),
      ...(identityChanged && { nameKey }),
      ...(input.defaultMonthlyFee !== undefined && {
        defaultMonthlyFee: input.defaultMonthlyFee,
      }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: { _count: { select: { students: { where: { archivedAt: null } } } } },
  })
  return toListItem(cls)
}

type ClassWithCount = Class & { _count: { students: number } }

function toListItem(cls: ClassWithCount): ClassListItem {
  return {
    id: cls.id,
    name: cls.name,
    section: cls.section,
    defaultMonthlyFee: Number(cls.defaultMonthlyFee),
    status: cls.status,
    studentCount: cls._count.students,
  }
}
