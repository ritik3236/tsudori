import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { ALL_CLASSES } from "@/lib/constants"
import { appDateToUtc, utcToAppDateStr, appMonthBounds } from "@/lib/date-helper"
import { resolveDay, resolveMonth } from "@/features/attendance/holiday-service"
import type { WorkingDay } from "@/lib/working-day"
import type { MarkAttendanceInput, BulkMarkInput } from "./schema"
import type {
  DayAttendance,
  MonthlyReport,
  MonthlyReportRow,
  StudentAttendance,
} from "./types"
import type { AttendanceStatus } from "@prisma/client"

const parseDate = appDateToUtc
const toDateStr = utcToAppDateStr

function computeSummary(students: StudentAttendance[]) {
  return {
    present: students.filter((s) => s.status === "PRESENT").length,
    absent: students.filter((s) => s.status === "ABSENT").length,
    leave: students.filter((s) => s.status === "LEAVE").length,
    unmarked: students.filter((s) => s.status === null).length,
    total: students.length,
  }
}

/** Blocks marking on a non-working day. Callers force the day open first (a
 *  WORKING holiday override) when they really mean to hold an extra class. */
function assertWorkingDay(day: WorkingDay): void {
  if (day.working) return
  throw new ValidationError(
    day.name
      ? `This day is a holiday (${day.name}). Mark it a working day to take attendance.`
      : "This is a non-working day. Mark it a working day to take attendance."
  )
}

async function getAttendanceDayAll(instituteId: string, date: string): Promise<DayAttendance> {
  const students = await prisma.student.findMany({
    where: { instituteId, status: "ACTIVE", archivedAt: null },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, serialNo: true, rollNumber: true, contactNumber: true },
  })

  const dateObj = parseDate(date)
  const existing = await prisma.attendance.findMany({
    where: {
      instituteId,
      studentId: { in: students.map((s) => s.id) },
      date: dateObj,
    },
    select: { id: true, studentId: true, status: true, note: true },
  })

  const byStudent = new Map(existing.map((a) => [a.studentId, a]))

  const records: StudentAttendance[] = students.map((s) => {
    const a = byStudent.get(s.id) ?? null
    return {
      studentId: s.id,
      studentName: s.fullName,
      serialNo: s.serialNo,
      rollNumber: s.rollNumber,
      contactNumber: s.contactNumber,
      attendanceId: a?.id ?? null,
      status: (a?.status ?? null) as AttendanceStatus | null,
      note: a?.note ?? null,
    }
  })

  const workingDay = await resolveDay(instituteId, null, date)

  return {
    date,
    classId: ALL_CLASSES,
    className: "All Classes",
    workingDay,
    students: records,
    summary: computeSummary(records),
  }
}

export async function getAttendanceDay(
  instituteId: string,
  classId: string,
  date: string
): Promise<DayAttendance> {
  if (classId === ALL_CLASSES) return getAttendanceDayAll(instituteId, date)

  const cls = await prisma.class.findFirst({
    where: { id: classId, instituteId },
    select: { id: true, name: true, section: true },
  })
  if (!cls) throw new NotFoundError("Class not found")

  const students = await prisma.student.findMany({
    where: { classId, instituteId, status: "ACTIVE", archivedAt: null },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, serialNo: true, rollNumber: true, contactNumber: true },
  })

  const dateObj = parseDate(date)
  const existing = await prisma.attendance.findMany({
    where: {
      instituteId,
      studentId: { in: students.map((s) => s.id) },
      date: dateObj,
    },
    select: { id: true, studentId: true, status: true, note: true },
  })

  const byStudent = new Map(existing.map((a) => [a.studentId, a]))

  const records: StudentAttendance[] = students.map((s) => {
    const a = byStudent.get(s.id) ?? null
    return {
      studentId: s.id,
      studentName: s.fullName,
      serialNo: s.serialNo,
      rollNumber: s.rollNumber,
      contactNumber: s.contactNumber,
      attendanceId: a?.id ?? null,
      status: (a?.status ?? null) as AttendanceStatus | null,
      note: a?.note ?? null,
    }
  })

  const workingDay = await resolveDay(instituteId, classId, date)

  return {
    date,
    classId,
    className: cls.name + (cls.section ? `/${cls.section}` : ""),
    workingDay,
    students: records,
    summary: computeSummary(records),
  }
}

export async function markAttendance(
  instituteId: string,
  input: MarkAttendanceInput,
  userId: string | null
): Promise<StudentAttendance> {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, instituteId },
    select: {
      id: true,
      fullName: true,
      serialNo: true,
      rollNumber: true,
      contactNumber: true,
      classId: true,
    },
  })
  if (!student) throw new NotFoundError("Student not found")

  assertWorkingDay(await resolveDay(instituteId, student.classId, input.date))

  const dateObj = parseDate(input.date)

  const record = await prisma.attendance.upsert({
    where: { studentId_date: { studentId: input.studentId, date: dateObj } },
    create: {
      instituteId,
      studentId: input.studentId,
      date: dateObj,
      status: input.status,
      note: input.note ?? null,
      markedById: userId,
    },
    update: {
      status: input.status,
      note: input.note ?? null,
      markedById: userId,
    },
  })

  return {
    studentId: student.id,
    studentName: student.fullName,
    serialNo: student.serialNo,
    rollNumber: student.rollNumber,
    contactNumber: student.contactNumber,
    attendanceId: record.id,
    status: record.status,
    note: record.note,
  }
}

export async function markBulkAttendance(
  instituteId: string,
  input: BulkMarkInput,
  userId: string | null
): Promise<DayAttendance> {
  assertWorkingDay(await resolveDay(instituteId, input.classId, input.date))

  const dateObj = parseDate(input.date)

  await prisma.$transaction(
    input.records.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: dateObj } },
        create: {
          instituteId,
          studentId: r.studentId,
          date: dateObj,
          status: r.status,
          note: r.note ?? null,
          markedById: userId,
        },
        update: {
          status: r.status,
          note: r.note ?? null,
          markedById: userId,
        },
      })
    )
  )

  if (input.classId === ALL_CLASSES) return getAttendanceDayAll(instituteId, input.date)
  return getAttendanceDay(instituteId, input.classId, input.date)
}

export async function getMonthlyReport(
  instituteId: string,
  classId: string,
  month: string
): Promise<MonthlyReport> {
  const cls = await prisma.class.findFirst({
    where: { id: classId, instituteId },
    select: { id: true, name: true, section: true },
  })
  if (!cls) throw new NotFoundError("Class not found")

  const [startDate, endDate] = appMonthBounds(month)

  const students = await prisma.student.findMany({
    where: { classId, instituteId, archivedAt: null },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, serialNo: true },
  })

  const records = await prisma.attendance.findMany({
    where: {
      instituteId,
      studentId: { in: students.map((s) => s.id) },
      date: { gte: startDate, lt: endDate },
    },
    select: { studentId: true, date: true, status: true },
    orderBy: { date: "asc" },
  })

  const schoolDaySet = new Set<string>()
  const byStudent = new Map<string, Map<string, AttendanceStatus>>()

  for (const r of records) {
    const d = toDateStr(r.date)
    schoolDaySet.add(d)
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, new Map())
    byStudent.get(r.studentId)!.set(d, r.status)
  }

  // Resolve the whole month so non-working days render as "H" columns and are
  // excluded from each student's counts — weekly-offs and named holidays alike.
  const monthMap = await resolveMonth(instituteId, classId, month)
  const holidays: Record<string, { name: string | null }> = {}
  for (const [d, wd] of Object.entries(monthMap)) {
    if (!wd.working) holidays[d] = { name: wd.name }
  }

  const schoolDays = Array.from(
    new Set([...schoolDaySet, ...Object.keys(holidays)])
  ).sort()

  const rows: MonthlyReportRow[] = students.map((s) => {
    const dayMap = byStudent.get(s.id) ?? new Map<string, AttendanceStatus>()
    const days: Record<string, AttendanceStatus> = {}
    let present = 0,
      absent = 0,
      leave = 0

    for (const day of schoolDays) {
      if (holidays[day]) continue // non-working column — shown as "H", never counted
      const status = dayMap.get(day)
      if (status) {
        days[day] = status
        if (status === "PRESENT") present++
        else if (status === "ABSENT") absent++
        else leave++
      }
    }

    return {
      studentId: s.id,
      studentName: s.fullName,
      serialNo: s.serialNo,
      summary: { present, absent, leave },
      days,
    }
  })

  return {
    classId,
    className: cls.name + (cls.section ? `/${cls.section}` : ""),
    month,
    schoolDays,
    holidays,
    rows,
  }
}
