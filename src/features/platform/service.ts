import "server-only"

import type { InstituteStatus, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/slug"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { requireSuperAdmin, type SuperAdminContext } from "@/lib/tenant"
import {
  ROLE_KEYS,
  SYSTEM_ROLES,
  resolveRolePermissions,
  type RoleKey,
} from "@/lib/rbac"
import { AUDIT_ACTIONS, recordAudit } from "@/features/audit/service"
import { MEMBER_INCLUDE, toMemberListItem } from "@/features/members/service"
import type { MemberListItem } from "@/features/members/types"
import type { StudentListItem } from "@/features/students/types"
import type { PlatformStudentQuery } from "@/features/platform/schema"

// The roles every institute gets — SUPER_ADMIN is a platform flag, not an
// institute role, so it's excluded.
const INSTITUTE_ROLE_KEYS: RoleKey[] = [
  ROLE_KEYS.INSTITUTE_ADMIN,
  ROLE_KEYS.TEACHER,
  ROLE_KEYS.AUDITOR,
]

export type PlatformInstituteRow = {
  id: string
  name: string
  status: InstituteStatus
  students: number
  members: number
  openTickets: number
  revenue: number
}

export type PlatformStats = {
  institutes: { total: number; active: number; suspended: number }
  students: number
  members: number
  openTickets: number
  revenue: number
  rows: PlatformInstituteRow[]
}

// Active members, excluding the platform super admin (role "admin") — they hold a
// bootstrap membership but aren't a real institute member. Null-safe on purpose: a
// member whose role is null (Better Auth's default can be null) is a normal member,
// but SQL evaluates `role <> 'admin'` as NULL → excluded, so we OR in the null case.
const REAL_MEMBER_WHERE: Prisma.MembershipWhereInput = {
  status: "ACTIVE",
  user: { OR: [{ role: null }, { role: { not: "admin" } }] },
}

/**
 * Cross-tenant platform overview — headline counts + a per-institute breakdown.
 * Deliberately UN-scoped (no instituteId), so it takes a SuperAdminContext: the
 * compiler refuses any caller that hasn't passed requireSuperAdmin. Counts use
 * groupBy + an in-memory stitch (no per-institute N+1).
 */
export async function getPlatformStats(
  ctx: SuperAdminContext
): Promise<PlatformStats> {
  requireSuperAdmin(ctx) // belt-and-suspenders; the type already enforced it

  const [
    byStatus,
    students,
    members,
    openTickets,
    revenueAgg,
    institutes,
    studentsByInst,
    ticketsByInst,
    revenueByInst,
    memberRows,
  ] = await Promise.all([
    prisma.institute.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.student.count({ where: { status: "ACTIVE", archivedAt: null } }),
    prisma.membership.count({ where: REAL_MEMBER_WHERE }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.feePayment.aggregate({ _sum: { amount: true } }),
    prisma.institute.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.student.groupBy({
      by: ["instituteId"],
      where: { status: "ACTIVE", archivedAt: null },
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["instituteId"],
      where: { status: "OPEN" },
      _count: { _all: true },
    }),
    prisma.feePayment.groupBy({ by: ["instituteId"], _sum: { amount: true } }),
    // Relation-filtered membership rows, tallied in memory (groupBy can't filter
    // on the related user's role; the set is small).
    prisma.membership.findMany({
      where: REAL_MEMBER_WHERE,
      select: { instituteId: true },
    }),
  ])

  const active = byStatus.find((s) => s.status === "ACTIVE")?._count._all ?? 0
  const suspended = byStatus.find((s) => s.status === "SUSPENDED")?._count._all ?? 0

  const studentsMap = new Map(studentsByInst.map((r) => [r.instituteId, r._count._all]))
  const ticketsMap = new Map(ticketsByInst.map((r) => [r.instituteId, r._count._all]))
  const revenueMap = new Map(
    revenueByInst.map((r) => [r.instituteId, Number(r._sum.amount ?? 0)])
  )
  const membersMap = new Map<string, number>()
  for (const m of memberRows) {
    membersMap.set(m.instituteId, (membersMap.get(m.instituteId) ?? 0) + 1)
  }

  const rows: PlatformInstituteRow[] = institutes.map((i) => ({
    id: i.id,
    name: i.name,
    status: i.status,
    students: studentsMap.get(i.id) ?? 0,
    members: membersMap.get(i.id) ?? 0,
    openTickets: ticketsMap.get(i.id) ?? 0,
    revenue: revenueMap.get(i.id) ?? 0,
  }))

  return {
    institutes: { total: active + suspended, active, suspended },
    students,
    members,
    openTickets,
    revenue: Number(revenueAgg._sum.amount ?? 0),
    rows,
  }
}

export type PlatformActivityItem = {
  id: string
  action: string
  actorName: string | null
  actorImage: string | null
  instituteName: string | null
  createdAt: string
}

/**
 * Recent sensitive changes — the platform activity feed. Un-scoped by default
 * (every institute); pass `instituteId` to narrow to one (the institute detail
 * page).
 */
export async function getPlatformActivity(
  ctx: SuperAdminContext,
  limit = 8,
  instituteId?: string
): Promise<PlatformActivityItem[]> {
  requireSuperAdmin(ctx)
  const rows = await prisma.auditLog.findMany({
    where: instituteId ? { instituteId } : undefined,
    include: {
      actor: { select: { name: true, image: true } },
      institute: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actorName: r.actor?.name ?? null,
    actorImage: r.actor?.image ?? null,
    instituteName: r.institute?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }))
}

/**
 * Create a new institute — a full tenant bootstrap, in one transaction:
 * the Institute row (with a unique slug) + its standard per-institute roles
 * (Institute Admin / Teacher / Auditor) and their permission grants, mirroring
 * what the seed does, + the first admin's membership on the Institute Admin role.
 *
 * The admin's Neon Auth identity is created by the caller (identity-first, so a
 * taken email fails before anything is written); `adminUserId` is that user's id,
 * linked here so the new tenant ships usable rather than empty. Returns the list
 * row (members: 1 — the admin we just linked).
 */
export async function createInstitute(
  ctx: SuperAdminContext,
  input: { name: string; adminUserId: string }
): Promise<PlatformInstituteRow> {
  requireSuperAdmin(ctx)

  return prisma.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx, input.name)
    const institute = await tx.institute.create({
      data: { name: input.name, slug },
      select: { id: true, name: true, status: true },
    })

    // Permissions are global (one shared set) — map key → id once.
    const allPerms = await tx.permission.findMany({ select: { id: true, key: true } })
    const permIdByKey = new Map(allPerms.map((p) => [p.key, p.id]))

    // Capture the Institute Admin role as we create it — the first admin lands on it.
    let adminRoleId: string | null = null
    for (const template of SYSTEM_ROLES) {
      if (!INSTITUTE_ROLE_KEYS.includes(template.key)) continue
      const role = await tx.role.create({
        data: {
          instituteId: institute.id,
          key: template.key,
          name: template.name,
          description: template.description,
          isSystem: true,
        },
        select: { id: true },
      })
      if (template.key === ROLE_KEYS.INSTITUTE_ADMIN) adminRoleId = role.id
      const grants = resolveRolePermissions(template)
        .map((key) => permIdByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId }))
      if (grants.length > 0) {
        await tx.rolePermission.createMany({ data: grants, skipDuplicates: true })
      }
    }
    if (!adminRoleId) throw new Error("Institute Admin role was not created.")

    // Link the first admin (identity already provisioned by the caller).
    await tx.membership.create({
      data: { userId: input.adminUserId, instituteId: institute.id, roleId: adminRoleId },
    })

    await recordAudit(tx, {
      instituteId: institute.id,
      actorId: ctx.user.id,
      action: AUDIT_ACTIONS.INSTITUTE_CREATE,
      entityType: "Institute",
      entityId: institute.id,
      metadata: { name: institute.name, slug },
    })

    return {
      id: institute.id,
      name: institute.name,
      status: institute.status,
      students: 0,
      members: 1,
      openTickets: 0,
      revenue: 0,
    }
  })
}

// A unique slug for the name: the base, else base-2, base-3, … Falls back to
// "institute" when the name has no slug-able characters.
async function uniqueSlug(
  tx: Prisma.TransactionClient,
  name: string
): Promise<string> {
  const base = slugify(name) || "institute"
  const taken = new Set(
    (
      await tx.institute.findMany({
        where: { slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((i) => i.slug)
  )
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// ─── Cross-tenant directories (read-only) ───────────────────────────────────
// Students and members across every institute. Acting on one means switching
// into its institute; these views are for finding/auditing across the platform.

export type PlatformStudentListItem = StudentListItem & {
  instituteId: string
  instituteName: string
}

export type PlatformStudentPage = {
  items: PlatformStudentListItem[]
  nextOffset: number | null
  total: number
}

/**
 * Every student across every institute, paginated. Mirrors listStudents'
 * where/search but drops the instituteId scope (super admin sees all) and adds
 * the owning institute to each row. Offset-paged with a +1 sentinel.
 */
export async function listPlatformStudents(
  ctx: SuperAdminContext,
  query: PlatformStudentQuery
): Promise<PlatformStudentPage> {
  requireSuperAdmin(ctx)

  // `archived` shows ONLY soft-deleted students; otherwise hide them and apply
  // the lifecycle-status filter.
  const where: Prisma.StudentWhereInput = query.archived
    ? { archivedAt: { not: null } }
    : { archivedAt: null, ...(query.status ? { status: query.status } : {}) }

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
      include: {
        class: { select: { name: true, section: true } },
        institute: { select: { name: true } },
      },
      orderBy: [{ institute: { name: "asc" } }, { fullName: "asc" }],
      skip: query.offset,
      take: DEFAULT_PAGE_SIZE + 1,
    }),
  ])

  const hasMore = rows.length > DEFAULT_PAGE_SIZE
  return {
    items: rows.slice(0, DEFAULT_PAGE_SIZE).map((s) => ({
      id: s.id,
      serialNo: s.serialNo,
      rollNumber: s.rollNumber,
      fullName: s.fullName,
      className: s.class?.name ?? null,
      classSection: s.class?.section ?? null,
      classId: s.classId,
      guardianName: s.guardianName,
      contactNumber: s.contactNumber,
      monthlyFee: Number(s.monthlyFee),
      status: s.status,
      admissionDate: s.admissionDate.toISOString(),
      photoUrl: s.photoUrl,
      instituteId: s.instituteId,
      instituteName: s.institute.name,
    })),
    nextOffset: hasMore ? query.offset + DEFAULT_PAGE_SIZE : null,
    total,
  }
}

export type PlatformMemberListItem = MemberListItem & {
  instituteId: string
  instituteName: string
}

/**
 * Active members (the platform super admin excluded, via the same null-safe
 * filter the stats use). Un-scoped by default (every institute); pass
 * `instituteId` to narrow to one (the institute detail page). Load-all — members
 * are sparse; if that changes, paginate like the student list. Reuses the
 * members feature's own include + row mapping, adding the owning institute.
 */
export async function listPlatformMembers(
  ctx: SuperAdminContext,
  instituteId?: string
): Promise<PlatformMemberListItem[]> {
  requireSuperAdmin(ctx)

  const rows = await prisma.membership.findMany({
    where: { ...REAL_MEMBER_WHERE, ...(instituteId ? { instituteId } : {}) },
    include: { ...MEMBER_INCLUDE, institute: { select: { name: true } } },
    orderBy: [{ institute: { name: "asc" } }, { createdAt: "asc" }],
  })
  return rows.map((m) => ({
    ...toMemberListItem(m),
    instituteId: m.instituteId,
    instituteName: m.institute.name,
  }))
}

export type InstituteDetail = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  email: string | null
  phone: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  country: string
  currency: string
  locale: string
  timezone: string
  status: InstituteStatus
  createdAt: string
  students: number
  members: number
  openTickets: number
  revenue: number
}

/**
 * One institute's profile + headline counts (the super-admin detail view). The
 * four counts mirror getPlatformStats' per-institute filters exactly, so they
 * match the institutes-list row. Returns null when the id doesn't exist → the
 * page 404s.
 */
export async function getInstituteDetail(
  ctx: SuperAdminContext,
  id: string
): Promise<InstituteDetail | null> {
  requireSuperAdmin(ctx)

  const institute = await prisma.institute.findUnique({ where: { id } })
  if (!institute) return null

  const [students, members, openTickets, revenueAgg] = await Promise.all([
    prisma.student.count({
      where: { instituteId: id, status: "ACTIVE", archivedAt: null },
    }),
    prisma.membership.count({ where: { ...REAL_MEMBER_WHERE, instituteId: id } }),
    prisma.ticket.count({ where: { instituteId: id, status: "OPEN" } }),
    prisma.feePayment.aggregate({ where: { instituteId: id }, _sum: { amount: true } }),
  ])

  return {
    id: institute.id,
    name: institute.name,
    slug: institute.slug,
    logoUrl: institute.logoUrl,
    email: institute.email,
    phone: institute.phone,
    addressLine: institute.addressLine,
    city: institute.city,
    state: institute.state,
    country: institute.country,
    currency: institute.currency,
    locale: institute.locale,
    timezone: institute.timezone,
    status: institute.status,
    createdAt: institute.createdAt.toISOString(),
    students,
    members,
    openTickets,
    revenue: Number(revenueAgg._sum.amount ?? 0),
  }
}
