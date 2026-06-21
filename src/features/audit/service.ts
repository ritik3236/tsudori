import "server-only"

import type { Prisma, PrismaClient } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { appDayBounds } from "@/lib/date-helper"
import type { AuditQuery } from "@/features/audit/schema"
import type { AuditPage } from "@/features/audit/types"

type Tx = PrismaClient | Prisma.TransactionClient

// Dotted action keys for the audit trail. Kept as string constants (not a DB
// enum) so adding an action later needs no migration; type-safety comes from
// AuditAction below.
export const AUDIT_ACTIONS = {
  FEE_PAYMENT_REVERSE: "fee.payment.reverse",
  FEE_WAIVER_REVERSE: "fee.waiver.reverse",
  FEE_WAIVE: "fee.waive",
  MEMBER_REMOVE: "member.remove",
  MEMBER_RESTORE: "member.restore",
  MEMBER_ROLE_CHANGE: "member.role_change",
  STUDENT_ARCHIVE: "student.archive",
  STUDENT_RESTORE: "student.restore",
  ROLE_PERMISSIONS_CHANGE: "role.permissions_change",
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

export type AuditEntry = {
  instituteId: string
  /** The acting user (ctx.user.id). Nullable only for system/no-actor writes. */
  actorId: string | null
  action: AuditAction
  /** The model the change touched, e.g. "FeePayment", "Membership", "Student". */
  entityType: string
  entityId: string
  /** Readable context (amounts, names, before/after) — plain JSON only. */
  metadata?: Prisma.InputJsonValue
}

/**
 * Append one audit row. Call this INSIDE the mutation's transaction (pass the
 * `tx` client) so the log commits atomically with the change — a trail entry
 * exists if and only if the mutation actually committed.
 */
export function recordAudit(tx: Tx, entry: AuditEntry) {
  return tx.auditLog.create({
    data: {
      instituteId: entry.instituteId,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata,
    },
  })
}

const AUDIT_PAGE_SIZE = 30

/** Paged audit log for the admin view — newest first, with optional filters. */
export async function listAuditLog(
  instituteId: string,
  query: AuditQuery
): Promise<AuditPage> {
  const where: Prisma.AuditLogWhereInput = {
    instituteId,
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
  }
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: appDayBounds(query.from)[0] } : {}),
      ...(query.to ? { lte: appDayBounds(query.to)[1] } : {}),
    }
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: AUDIT_PAGE_SIZE + 1,
    }),
  ])

  const hasMore = rows.length > AUDIT_PAGE_SIZE
  return {
    items: rows.slice(0, AUDIT_PAGE_SIZE).map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      actorName: r.actor?.name ?? null,
      actorImage: r.actor?.image ?? null,
      metadata: (r.metadata ?? null) as Record<string, unknown> | null,
      createdAt: r.createdAt.toISOString(),
    })),
    nextOffset: hasMore ? query.offset + AUDIT_PAGE_SIZE : null,
    total,
  }
}
