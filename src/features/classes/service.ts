import "server-only"

import { cache } from "react"
import type { Class } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/errors"
import type { ClassListItem } from "@/features/classes/types"
import type { ClassCreateInput, ClassUpdateInput } from "@/features/classes/schema"

// Kept for the student-form class select — lightweight, active-only.
export async function listClassOptions(
  instituteId: string
): Promise<{ id: string; name: string }[]> {
  return prisma.class.findMany({
    where: { instituteId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
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
    orderBy: { name: "asc" },
    include: { _count: { select: { students: { where: { archivedAt: null } } } } },
  })
  return rows.map(toListItem)
}

export async function createClass(
  instituteId: string,
  input: ClassCreateInput
): Promise<ClassListItem> {
  const existing = await prisma.class.findFirst({
    where: { instituteId, name: input.name },
  })
  if (existing) throw new ConflictError(`A class named "${input.name}" already exists.`)

  const cls = await prisma.class.create({
    data: {
      instituteId,
      name: input.name,
      section: input.section ?? null,
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

  if (input.name && input.name !== existing.name) {
    const conflict = await prisma.class.findFirst({
      where: { instituteId, name: input.name, id: { not: id } },
    })
    if (conflict) throw new ConflictError(`A class named "${input.name}" already exists.`)
  }

  const cls = await prisma.class.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.section !== undefined && { section: input.section ?? null }),
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
