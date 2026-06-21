import type { AttendanceStatus, HolidayKind } from "@prisma/client"
import type { WorkingDay } from "@/lib/working-day"
export type { AttendanceStatus, HolidayKind }
export type { WorkingDay }

/** A holiday/working-day ruling row, as returned to the client. */
export type HolidayItem = {
  id: string
  classId: string | null
  className: string | null
  date: string
  kind: HolidayKind
  name: string | null
}

export type StudentAttendance = {
  studentId: string
  studentName: string
  serialNo: number
  rollNumber: string | null
  contactNumber: string | null
  attendanceId: string | null
  status: AttendanceStatus | null
  note: string | null
}

export type DayAttendance = {
  date: string
  classId: string
  className: string
  /** Whether this date is a working day for the class — drives the holiday banner
   *  and gates auto-mark/marking. */
  workingDay: WorkingDay
  students: StudentAttendance[]
  summary: {
    present: number
    absent: number
    leave: number
    unmarked: number
    total: number
  }
}

export type MonthlyReportRow = {
  studentId: string
  studentName: string
  serialNo: number
  summary: { present: number; absent: number; leave: number }
  days: Record<string, AttendanceStatus>
}

export type MonthlyReport = {
  classId: string
  className: string
  month: string
  schoolDays: string[]
  /** OFF days within the month (keyed by YYYY-MM-DD) → rendered as a greyed "H"
   *  column and excluded from attendance counts. */
  holidays: Record<string, { name: string | null }>
  rows: MonthlyReportRow[]
}
