import type { AttendanceStatus } from "@prisma/client"
export type { AttendanceStatus }

export type StudentAttendance = {
  studentId: string
  studentName: string
  serialNo: number
  rollNumber: string | null
  attendanceId: string | null
  status: AttendanceStatus | null
  note: string | null
}

export type DayAttendance = {
  date: string
  classId: string
  className: string
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
  rows: MonthlyReportRow[]
}
