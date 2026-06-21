import "server-only"

import type { Prisma, PrismaClient, Student } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { recordAudit, AUDIT_ACTIONS } from "@/features/audit/service"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { nowDate } from "@/lib/date-helper"
import type {
  StudentDetail,
  StudentListItem,
  StudentPage,
} from "@/features/students/types"
import type {
  StudentCreateInput,
  StudentQuery,
  StudentUpdateInput,
} from "@/features/students/schema"

type Tx = PrismaClient | Prisma.TransactionClient

// Every function takes instituteId as its first argument — the tenant boundary is
// explicit and impossible to forget. Nothing here reads the request context.

async function assertClassInInstitute(tx: Tx, instituteId: string, classId: string) {
  const cls = await tx.class.findFirst({
    where: { id: classId, instituteId },
    select: { id: true },
  })
  if (!cls) throw new ValidationError("Selected class doesn't belong to this institute.")
}

export async function listStudents(
  instituteId: string,
  query: StudentQuery
): Promise<StudentPage> {
  const where: Prisma.StudentWhereInput = {
    instituteId,
    ...(query.classId ? { classId: query.classId } : {}),
    // `archived` shows ONLY soft-deleted students; otherwise hide them and apply
    // the lifecycle-status filter.
    ...(query.archived
      ? { archivedAt: { not: null } }
      : { archivedAt: null, ...(query.status ? { status: query.status } : {}) }),
  }

  if (query.q) {
    const q = query.q
    const or: Prisma.StudentWhereInput[] = [
      { fullName: { contains: q, mode: "insensitive" } },
      { guardianName: { contains: q, mode: "insensitive" } },
      { contactNumber: { contains: q } },
      { rollNumber: { contains: q, mode: "insensitive" } },
    ]
    const asSerial = Number(q)
    if (Number.isInteger(asSerial)) or.push({ serialNo: asSerial })
    where.OR = or
  }

  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: { class: { select: { name: true, section: true } } },
      orderBy: { fullName: "asc" },
      // Fetch one extra row to signal "there's more" without a second query.
      skip: query.offset,
      take: DEFAULT_PAGE_SIZE + 1,
    }),
  ])

  const hasMore = rows.length > DEFAULT_PAGE_SIZE
  return {
    items: rows.slice(0, DEFAULT_PAGE_SIZE).map(toListItem),
    nextOffset: hasMore ? query.offset + DEFAULT_PAGE_SIZE : null,
    total,
  }
}

export async function getStudent(
  instituteId: string,
  id: string,
  // Collected-fee figures (totalPaid / paymentsCount / recentPayments) are only
  // queried when the caller has fee:read. Defaults to true for internal callers
  // (post-create/update); the page and API route pass the permission result.
  opts: { includeFinancials: boolean } = { includeFinancials: true }
): Promise<StudentDetail> {
  const student = await prisma.student.findFirst({
    where: { id, instituteId },
    include: { class: { select: { name: true, section: true } } },
  })
  if (!student) throw new NotFoundError("Student not found.")

  const [attendanceGroups, financials] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["status"],
      where: { studentId: id, instituteId },
      _count: { _all: true },
    }),
    opts.includeFinancials
      ? (async () => {
          // totalPaid is net of reversals (sum over all rows, incl. negative
          // credit notes); the count and recent list cover real payments only.
          const [paidAgg, paymentsCount, recentPayments] = await Promise.all([
            prisma.feePayment.aggregate({
              where: { studentId: id, instituteId },
              _sum: { amount: true },
            }),
            prisma.feePayment.count({
              where: { studentId: id, instituteId, reversalOfId: null },
            }),
            prisma.feePayment.findMany({
              where: { studentId: id, instituteId, reversalOfId: null },
              orderBy: { paidAt: "desc" },
              take: 5,
            }),
          ])
          return {
            totalPaid: Number(paidAgg._sum.amount ?? 0),
            paymentsCount,
            recentPayments: recentPayments.map((p) => ({
              id: p.id,
              amount: Number(p.amount),
              paidAt: p.paidAt.toISOString(),
              receiptNo: p.receiptNo ?? 0,
              method: p.method,
            })),
          }
        })()
      : Promise.resolve(null),
  ])

  const att = (s: "PRESENT" | "ABSENT" | "LEAVE") =>
    attendanceGroups.find((g) => g.status === s)?._count._all ?? 0

  return {
    ...toListItem(student),
    email: student.email,
    notes: student.notes,
    archivedAt: student.archivedAt?.toISOString() ?? null,
    createdAt: student.createdAt.toISOString(),
    fees: {
      monthlyFee: Number(student.monthlyFee),
      totalPaid: financials?.totalPaid ?? null,
      paymentsCount: financials?.paymentsCount ?? null,
    },
    attendance: {
      present: att("PRESENT"),
      absent: att("ABSENT"),
      leave: att("LEAVE"),
    },
    recentPayments: financials?.recentPayments ?? null,
  }
}

export async function createStudent(
  instituteId: string,
  input: StudentCreateInput
): Promise<StudentDetail> {
  const created = await prisma.$transaction(async (tx) => {
    if (input.classId) await assertClassInInstitute(tx, instituteId, input.classId)

    // Per-tenant sequential serial number. The unique (instituteId, serialNo)
    // constraint is the ultimate guard against races.
    const last = await tx.student.findFirst({
      where: { instituteId },
      orderBy: { serialNo: "desc" },
      select: { serialNo: true },
    })

    return tx.student.create({
      data: {
        instituteId,
        serialNo: (last?.serialNo ?? 0) + 1,
        fullName: input.fullName,
        classId: input.classId ?? null,
        rollNumber: input.rollNumber ?? null,
        guardianName: input.guardianName ?? null,
        contactNumber: input.contactNumber ?? null,
        email: input.email ?? null,
        admissionDate: input.admissionDate,
        monthlyFee: input.monthlyFee,
        status: input.status,
        notes: input.notes ?? null,
      },
    })
  })

  return getStudent(instituteId, created.id)
}

export async function updateStudent(
  instituteId: string,
  id: string,
  input: StudentUpdateInput
): Promise<StudentDetail> {
  const existing = await prisma.student.findFirst({
    where: { id, instituteId },
    select: { id: true },
  })
  if (!existing) throw new NotFoundError("Student not found.")

  if (input.classId) await assertClassInInstitute(prisma, instituteId, input.classId)

  const data: Prisma.StudentUpdateInput = {}
  if (input.fullName !== undefined) data.fullName = input.fullName
  if (input.rollNumber !== undefined) data.rollNumber = input.rollNumber ?? null
  if (input.guardianName !== undefined) data.guardianName = input.guardianName ?? null
  if (input.contactNumber !== undefined) data.contactNumber = input.contactNumber ?? null
  if (input.email !== undefined) data.email = input.email ?? null
  if (input.admissionDate !== undefined) data.admissionDate = input.admissionDate
  if (input.monthlyFee !== undefined) data.monthlyFee = input.monthlyFee
  if (input.status !== undefined) data.status = input.status
  if (input.notes !== undefined) data.notes = input.notes ?? null
  if (input.classId !== undefined) {
    data.class = input.classId
      ? { connect: { id: input.classId } }
      : { disconnect: true }
  }

  await prisma.student.update({ where: { id }, data })
  return getStudent(instituteId, id)
}

/** Soft-archive: drops the student from active lists but keeps all history. */
export async function archiveStudent(
  instituteId: string,
  id: string,
  actorId: string,
  reason?: string | null
): Promise<void> {
  const existing = await prisma.student.findFirst({
    where: { id, instituteId },
    select: { id: true, fullName: true, serialNo: true },
  })
  if (!existing) throw new NotFoundError("Student not found.")

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id },
      // Archiving is a soft-delete only — it doesn't change the lifecycle status,
      // so a "Left"/"Completed" student keeps that status while archived.
      data: { archivedAt: nowDate() },
    })
    await recordAudit(tx, {
      instituteId,
      actorId,
      action: AUDIT_ACTIONS.STUDENT_ARCHIVE,
      entityType: "Student",
      entityId: id,
      metadata: {
        studentName: existing.fullName,
        serialNo: existing.serialNo,
        reason: reason || null,
      },
    })
  })
}

type StudentWithClass = Student & { class: { name: string; section: string } | null }

function toListItem(student: StudentWithClass): StudentListItem {
  return {
    id: student.id,
    serialNo: student.serialNo,
    rollNumber: student.rollNumber,
    fullName: student.fullName,
    className: student.class?.name ?? null,
    classSection: student.class?.section ?? null,
    classId: student.classId,
    guardianName: student.guardianName,
    contactNumber: student.contactNumber,
    monthlyFee: Number(student.monthlyFee),
    status: student.status,
    admissionDate: student.admissionDate.toISOString(),
    photoUrl: student.photoUrl,
  }
}
