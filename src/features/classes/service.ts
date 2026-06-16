import "server-only"

import { prisma } from "@/lib/prisma"
import type { ClassOption } from "@/features/students/types"

export async function listClassOptions(instituteId: string): Promise<ClassOption[]> {
  const classes = await prisma.class.findMany({
    where: { instituteId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return classes
}
