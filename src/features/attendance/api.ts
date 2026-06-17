"use client"

import { http, buildQuery } from "@/lib/http"
import type { DayAttendance, MonthlyReport, StudentAttendance } from "./types"
import type { BulkMarkInput, MarkAttendanceInput } from "./schema"

export const attendanceApi = {
  getDay: (classId: string, date: string) =>
    http.get<DayAttendance>(`/api/attendance${buildQuery({ classId, date })}`),

  mark: (data: MarkAttendanceInput) =>
    http.post<StudentAttendance>("/api/attendance", data),

  markBulk: (data: BulkMarkInput) =>
    http.post<DayAttendance>("/api/attendance/bulk", data),

  report: (classId: string, month: string) =>
    http.get<MonthlyReport>(`/api/attendance/report${buildQuery({ classId, month })}`),
}
