import "server-only"

import type { HolidayKind } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import { ALL_CLASSES } from "@/lib/constants"
import {
  appDateToUtc,
  appMonthBounds,
  appWeekday,
  eachDayOfMonthStr,
  utcToAppDateStr,
} from "@/lib/date-helper"
import {
  DEFAULT_WEEKLY_OFF,
  effectiveWeeklyOff,
  parseWeeklyOff,
  resolveWorkingDay,
  type Ruling,
  type WorkingDay,
} from "@/lib/working-day"
import type { HolidayItem } from "@/features/attendance/types"

// Holidays + working-day config for attendance. The institute weekly-off default
// lives in the generic Setting table; per-class overrides on Class; dated rulings
// in the Holiday table. Resolution precedence is in src/lib/working-day.ts.

const WEEKLY_OFF_KEY = "attendance.weeklyOff"

/** ALL_CLASSES (the "all classes" sentinel) resolves against institute-wide rules. */
function toResolveClassId(classId: string | null): string | null {
  return classId && classId !== ALL_CLASSES ? classId : null
}

// ─── Weekly-off config ────────────────────────────────────────────────────────

/** Institute default weekly-off (Luxon weekdays). Falls back to Sunday. */
export async function getInstituteWeeklyOff(instituteId: string): Promise<number[]> {
  const row = await prisma.setting.findUnique({
    where: { instituteId_key: { instituteId, key: WEEKLY_OFF_KEY } },
    select: { value: true },
  })
  return parseWeeklyOff(row?.value) ?? DEFAULT_WEEKLY_OFF
}

export async function saveInstituteWeeklyOff(
  instituteId: string,
  days: number[]
): Promise<void> {
  const value = parseWeeklyOff(days) ?? []
  await prisma.setting.upsert({
    where: { instituteId_key: { instituteId, key: WEEKLY_OFF_KEY } },
    create: { instituteId, key: WEEKLY_OFF_KEY, value },
    update: { value },
  })
}

async function getClassWeeklyOffOverride(
  instituteId: string,
  classId: string | null
): Promise<number[] | null> {
  if (!classId) return null
  const cls = await prisma.class.findFirst({
    where: { id: classId, instituteId },
    select: { weeklyOffOverride: true },
  })
  return parseWeeklyOff(cls?.weeklyOffOverride)
}

// ─── Resolution ───────────────────────────────────────────────────────────────

function ruleFrom(
  match: { kind: HolidayKind; name: string | null } | undefined
): Ruling | null {
  return match ? { kind: match.kind, name: match.name } : null
}

/** Resolve a single date for a class (or institute-wide when classId is null/ALL). */
export async function resolveDay(
  instituteId: string,
  classId: string | null,
  dateStr: string
): Promise<WorkingDay> {
  const cid = toResolveClassId(classId)
  const dateObj = appDateToUtc(dateStr)

  const [instituteWeeklyOff, classOverride, rulings] = await Promise.all([
    getInstituteWeeklyOff(instituteId),
    getClassWeeklyOffOverride(instituteId, cid),
    prisma.holiday.findMany({
      where: {
        instituteId,
        date: dateObj,
        OR: [{ classId: null }, ...(cid ? [{ classId: cid }] : [])],
      },
      select: { classId: true, kind: true, name: true },
    }),
  ])

  return resolveWorkingDay({
    weekday: appWeekday(dateStr),
    weeklyOff: effectiveWeeklyOff(instituteWeeklyOff, classOverride),
    classRuling: ruleFrom(rulings.find((r) => r.classId !== null)),
    instituteRuling: ruleFrom(rulings.find((r) => r.classId === null)),
  })
}

/** Resolve every day of a month — used to mark holiday columns in the report. */
export async function resolveMonth(
  instituteId: string,
  classId: string | null,
  monthStr: string
): Promise<Record<string, WorkingDay>> {
  const cid = toResolveClassId(classId)
  const [startDate, endDate] = appMonthBounds(monthStr)

  const [instituteWeeklyOff, classOverride, holidays] = await Promise.all([
    getInstituteWeeklyOff(instituteId),
    getClassWeeklyOffOverride(instituteId, cid),
    prisma.holiday.findMany({
      where: {
        instituteId,
        date: { gte: startDate, lt: endDate },
        OR: [{ classId: null }, ...(cid ? [{ classId: cid }] : [])],
      },
      select: { classId: true, date: true, kind: true, name: true },
    }),
  ])

  const weeklyOff = effectiveWeeklyOff(instituteWeeklyOff, classOverride)
  const instituteByDate = new Map<string, Ruling>()
  const classByDate = new Map<string, Ruling>()
  for (const h of holidays) {
    const d = utcToAppDateStr(h.date)
    if (h.classId === null) instituteByDate.set(d, { kind: h.kind, name: h.name })
    else classByDate.set(d, { kind: h.kind, name: h.name })
  }

  const out: Record<string, WorkingDay> = {}
  for (const d of eachDayOfMonthStr(monthStr)) {
    out[d] = resolveWorkingDay({
      weekday: appWeekday(d),
      weeklyOff,
      classRuling: classByDate.get(d) ?? null,
      instituteRuling: instituteByDate.get(d) ?? null,
    })
  }
  return out
}

// ─── Holiday CRUD ─────────────────────────────────────────────────────────────

function toHolidayItem(h: {
  id: string
  classId: string | null
  date: Date
  kind: HolidayKind
  name: string | null
  class?: { name: string; section: string } | null
}): HolidayItem {
  return {
    id: h.id,
    classId: h.classId,
    className: h.class ? `${h.class.name}/${h.class.section}` : null,
    date: utcToAppDateStr(h.date),
    kind: h.kind,
    name: h.name,
  }
}

/** Holidays in a month window (institute-wide + optionally one class). */
export async function listHolidays(
  instituteId: string,
  opts: { month?: string; classId?: string | null } = {}
): Promise<HolidayItem[]> {
  const where: {
    instituteId: string
    date?: { gte: Date; lt: Date }
    classId: string | null
  } = { instituteId, classId: toResolveClassId(opts.classId ?? null) }
  if (opts.month) {
    const [start, end] = appMonthBounds(opts.month)
    where.date = { gte: start, lt: end }
  }

  const rows = await prisma.holiday.findMany({
    where,
    orderBy: { date: "asc" },
    include: { class: { select: { name: true, section: true } } },
  })
  return rows.map(toHolidayItem)
}

/** Create or update the ruling for a (class?, date). Idempotent on that key. */
export async function upsertHoliday(
  instituteId: string,
  input: { classId?: string | null; date: string; kind: HolidayKind; name?: string | null },
  userId: string | null
): Promise<HolidayItem> {
  const classId = toResolveClassId(input.classId ?? null)
  const dateObj = appDateToUtc(input.date)

  if (classId) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, instituteId },
      select: { id: true },
    })
    if (!cls) throw new NotFoundError("Class not found.")
  }

  // findFirst + create/update rather than upsert: Prisma can't target a compound
  // unique whose column is NULL (institute-wide rows), so we match explicitly.
  const existing = await prisma.holiday.findFirst({
    where: { instituteId, classId, date: dateObj },
    select: { id: true },
  })

  const row = existing
    ? await prisma.holiday.update({
        where: { id: existing.id },
        data: { kind: input.kind, name: input.name ?? null },
        include: { class: { select: { name: true, section: true } } },
      })
    : await prisma.holiday.create({
        data: {
          instituteId,
          classId,
          date: dateObj,
          kind: input.kind,
          name: input.name ?? null,
          createdById: userId,
        },
        include: { class: { select: { name: true, section: true } } },
      })

  return toHolidayItem(row)
}

export async function deleteHoliday(instituteId: string, id: string): Promise<void> {
  const existing = await prisma.holiday.findFirst({
    where: { id, instituteId },
    select: { id: true },
  })
  if (!existing) throw new NotFoundError("Holiday not found.")
  await prisma.holiday.delete({ where: { id } })
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Deletes attendance for a single day so a (newly-flagged) holiday's phantom
 * records don't linger — scoped to one class's students, or the whole institute
 * when classId is null/ALL. Returns how many rows were removed.
 */
export async function clearDayAttendance(
  instituteId: string,
  classId: string | null,
  dateStr: string
): Promise<number> {
  const cid = toResolveClassId(classId)
  const dateObj = appDateToUtc(dateStr)
  const studentWhere = cid ? { classId: cid } : {}
  const studentIds = (
    await prisma.student.findMany({
      where: { instituteId, ...studentWhere },
      select: { id: true },
    })
  ).map((s) => s.id)

  const { count } = await prisma.attendance.deleteMany({
    where: { instituteId, date: dateObj, studentId: { in: studentIds } },
  })
  return count
}
