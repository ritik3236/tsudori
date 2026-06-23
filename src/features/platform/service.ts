import "server-only"

import type { InstituteStatus, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireSuperAdmin, type SuperAdminContext } from "@/lib/tenant"

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

/** Recent sensitive changes across every institute — the platform activity feed. */
export async function getPlatformActivity(
  ctx: SuperAdminContext,
  limit = 8
): Promise<PlatformActivityItem[]> {
  requireSuperAdmin(ctx)
  const rows = await prisma.auditLog.findMany({
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
