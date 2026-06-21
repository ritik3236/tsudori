"use client"

import { http, buildQuery } from "@/lib/http"
import type {
  DayAttendance,
  HolidayItem,
  MonthlyReport,
  StudentAttendance,
} from "./types"
import type { BulkMarkInput, HolidayUpsertInput, MarkAttendanceInput } from "./schema"

export const attendanceApi = {
  getDay: (classId: string, date: string) =>
    http.get<DayAttendance>(`/api/attendance${buildQuery({ classId, date })}`),

  mark: (data: MarkAttendanceInput) =>
    http.post<StudentAttendance>("/api/attendance", data),

  markBulk: (data: BulkMarkInput) =>
    http.post<DayAttendance>("/api/attendance/bulk", data),

  report: (classId: string, month: string) =>
    http.get<MonthlyReport>(`/api/attendance/report${buildQuery({ classId, month })}`),

  // Holidays / working-day config
  getConfig: () => http.get<{ weeklyOff: number[] }>("/api/attendance/config"),
  saveConfig: (weeklyOff: number[]) =>
    http.patch<{ weeklyOff: number[] }>("/api/attendance/config", { weeklyOff }),

  listHolidays: (month: string, classId?: string) =>
    http.get<HolidayItem[]>(`/api/attendance/holidays${buildQuery({ month, classId })}`),
  upsertHoliday: (data: HolidayUpsertInput) =>
    http.post<HolidayItem>("/api/attendance/holidays", data),
  deleteHoliday: (id: string) =>
    http.delete<{ id: string }>(`/api/attendance/holidays/${id}`),

  // Day-level workflow (part of marking)
  holdClass: (classId: string, date: string) =>
    http.post<HolidayItem>("/api/attendance/day/override", { classId, date }),
  clearDay: (classId: string, date: string) =>
    http.post<{ count: number }>("/api/attendance/day/clear", { classId, date }),
}
