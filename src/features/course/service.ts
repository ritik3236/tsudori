import "server-only"

import { cache } from "react"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors"
import { effectiveFee } from "@/features/fees/logic"
import type { CourseListItem, CourseStudentItem } from "@/features/course/types"
import {
  normalizeCourseKey,
  type CourseCreateInput,
  type CourseUpdateInput,
} from "@/features/course/schema"

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

const courseInclude = {
  components: { orderBy: { createdAt: "asc" } },
  bundleItems: { include: { member: { select: { id: true, name: true, monthlyFee: true } } } },
  _count: { select: { classes: true, enrollments: true } },
} satisfies Prisma.CourseInclude

type CourseRow = Prisma.CourseGetPayload<{ include: typeof courseInclude }>

function toListItem(c: CourseRow): CourseListItem {
  return {
    id: c.id,
    name: c.name,
    durationMonths: c.durationMonths,
    monthlyFee: Number(c.monthlyFee),
    status: c.status,
    isBundle: c.isBundle,
    members: c.bundleItems.map((b) => ({
      id: b.member.id,
      name: b.member.name,
      monthlyFee: Number(b.member.monthlyFee),
    })),
    components: c.components.map((m) => ({
      id: m.id,
      name: m.name,
      amount: Number(m.amount),
    })),
    classCount: c._count.classes,
    enrollmentCount: c._count.enrollments,
  }
}

// cache()-wrapped like getClass: the detail route reads it in generateMetadata
// AND the page body; cache() collapses the two identical queries into one.
export const getCourse = cache(
  async (instituteId: string, id: string): Promise<CourseListItem> => {
    const course = await prisma.course.findFirst({
      where: { id, instituteId },
      include: courseInclude,
    })
    if (!course) throw new NotFoundError("Course not found.")
    return toListItem(course)
  }
)

export async function listCourses(instituteId: string): Promise<CourseListItem[]> {
  const rows = await prisma.course.findMany({
    where: { instituteId },
    include: courseInclude,
  })
  return rows.map(toListItem).sort((a, b) => collator.compare(a.name, b.name))
}

/**
 * Validates requested bundle member ids: all must belong to THIS institute, be
 * non-bundle courses, and exclude the bundle itself. Returns the deduped, verified
 * list; throws on any unknown/foreign/self/nested id. The form filters these, but
 * the service is the tenancy boundary — without this a crafted request could attach
 * (and leak the name of) another institute's course, or nest bundles.
 */
async function resolveBundleMemberIds(
  instituteId: string,
  memberCourseIds: string[],
  selfId: string | null
): Promise<string[]> {
  const wanted = [...new Set(memberCourseIds)].filter((mid) => mid !== selfId)
  if (wanted.length === 0) return []
  const valid = await prisma.course.findMany({
    where: { instituteId, isBundle: false, id: { in: wanted } },
    select: { id: true },
  })
  if (valid.length !== wanted.length) {
    throw new ValidationError("A selected bundle course is invalid or unavailable.")
  }
  return wanted
}

export async function createCourse(
  instituteId: string,
  input: CourseCreateInput
): Promise<CourseListItem> {
  const nameKey = normalizeCourseKey(input.name)
  const existing = await prisma.course.findFirst({
    where: { instituteId, nameKey },
    select: { id: true },
  })
  if (existing) throw new ConflictError(`A course "${input.name}" already exists.`)

  const memberIds =
    input.isBundle && input.memberCourseIds?.length
      ? await resolveBundleMemberIds(instituteId, input.memberCourseIds, null)
      : []

  const course = await prisma.course.create({
    data: {
      instituteId,
      name: input.name,
      nameKey,
      durationMonths: input.durationMonths,
      monthlyFee: input.monthlyFee,
      status: input.status,
      isBundle: input.isBundle ?? false,
      components: input.components?.length
        ? { create: input.components.map((c) => ({ name: c.name, amount: c.amount })) }
        : undefined,
      bundleItems: memberIds.length
        ? { create: memberIds.map((mid) => ({ memberCourseId: mid })) }
        : undefined,
    },
    include: courseInclude,
  })
  return toListItem(course)
}

export async function updateCourse(
  instituteId: string,
  id: string,
  input: CourseUpdateInput
): Promise<CourseListItem> {
  const existing = await prisma.course.findFirst({ where: { id, instituteId } })
  if (!existing) throw new NotFoundError("Course not found.")

  // Re-check name uniqueness only when the name actually changed.
  let nameKey = existing.nameKey
  if (input.name !== undefined) {
    nameKey = normalizeCourseKey(input.name)
    if (nameKey !== existing.nameKey) {
      const conflict = await prisma.course.findFirst({
        where: { instituteId, nameKey, id: { not: id } },
        select: { id: true },
      })
      if (conflict) throw new ConflictError(`A course "${input.name}" already exists.`)
    }
  }

  // Validate bundle members up front (tenancy + non-bundle + not-self), like the
  // name check — then the in-tx write below trusts the verified list.
  const memberIds =
    input.memberCourseIds !== undefined
      ? await resolveBundleMemberIds(instituteId, input.memberCourseIds, id)
      : undefined

  const course = await prisma.$transaction(async (tx) => {
    // Components are replace-all when provided (charges store a label snapshot, so
    // editing the catalog never rewrites past charges).
    if (input.components !== undefined) {
      await tx.courseFeeComponent.deleteMany({ where: { courseId: id } })
      if (input.components.length) {
        await tx.courseFeeComponent.createMany({
          data: input.components.map((c) => ({ courseId: id, name: c.name, amount: c.amount })),
        })
      }
    }
    // Bundle members are replace-all when provided (verified above).
    if (memberIds !== undefined) {
      await tx.courseBundleItem.deleteMany({ where: { bundleCourseId: id } })
      if (memberIds.length) {
        await tx.courseBundleItem.createMany({
          data: memberIds.map((mid) => ({ bundleCourseId: id, memberCourseId: mid })),
        })
      }
    }
    return tx.course.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name, nameKey }),
        ...(input.durationMonths !== undefined && { durationMonths: input.durationMonths }),
        ...(input.monthlyFee !== undefined && { monthlyFee: input.monthlyFee }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.isBundle !== undefined && { isBundle: input.isBundle }),
      },
      include: courseInclude,
    })
  })
  return toListItem(course)
}

/** Students enrolled on a course (any status), with their effective fee — for the
 * course detail page. */
export async function listCourseStudents(
  instituteId: string,
  courseId: string
): Promise<CourseStudentItem[]> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, instituteId },
    select: { monthlyFee: true },
  })
  if (!course) return []
  const enrollments = await prisma.enrollment.findMany({
    where: { instituteId, courseId },
    select: {
      feeOverride: true,
      discountPercent: true,
      status: true,
      student: { select: { id: true, fullName: true, serialNo: true } },
    },
    orderBy: { student: { fullName: "asc" } },
  })
  const base = Number(course.monthlyFee)
  return enrollments.map((e) => ({
    studentId: e.student.id,
    fullName: e.student.fullName,
    serialNo: e.student.serialNo,
    effectiveFee: effectiveFee(
      base,
      e.feeOverride != null ? Number(e.feeOverride) : null,
      e.discountPercent != null ? Number(e.discountPercent) : null
    ),
    status: e.status,
  }))
}
