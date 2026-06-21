"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { attendanceApi } from "./api"
import { attendanceKeys } from "./keys"
import type { DayAttendance } from "./types"
import type { BulkMarkInput, HolidayUpsertInput, MarkAttendanceInput } from "./schema"

export { attendanceKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

function computeSummary(students: DayAttendance["students"]) {
  return {
    present: students.filter((s) => s.status === "PRESENT").length,
    absent: students.filter((s) => s.status === "ABSENT").length,
    leave: students.filter((s) => s.status === "LEAVE").length,
    unmarked: students.filter((s) => s.status === null).length,
    total: students.length,
  }
}

export function useAttendanceDay(classId: string | null, date: string | null) {
  return useQuery({
    queryKey: attendanceKeys.day(classId ?? "", date ?? ""),
    queryFn: () => attendanceApi.getDay(classId!, date!),
    enabled: Boolean(classId && date),
  })
}

export function useMarkAttendance(classId: string, date: string) {
  const qc = useQueryClient()
  const key = attendanceKeys.day(classId, date)

  return useMutation({
    mutationFn: (data: MarkAttendanceInput) => attendanceApi.mark(data),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DayAttendance>(key)
      if (prev) {
        const updated = prev.students.map((s) =>
          s.studentId === vars.studentId ? { ...s, status: vars.status } : s
        )
        qc.setQueryData<DayAttendance>(key, {
          ...prev,
          students: updated,
          summary: computeSummary(updated),
        })
      }
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
      reportError(err, "Couldn't mark attendance.")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useMarkBulkAttendance(classId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkMarkInput) => attendanceApi.markBulk(data),
    onSuccess: (result) => {
      qc.setQueryData(attendanceKeys.day(classId, date), result)
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save attendance.")
    },
  })
}

export function useAttendanceReport(classId: string | null, month: string | null) {
  return useQuery({
    queryKey: attendanceKeys.report(classId ?? "", month ?? ""),
    queryFn: () => attendanceApi.report(classId!, month!),
    enabled: Boolean(classId && month),
  })
}

// ─── Holidays / working-day config ─────────────────────────────────────────────

/** Opens a non-working day for marking ("Hold class today" → WORKING override). */
export function useHoldClass(classId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => attendanceApi.holdClass(classId, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.day(classId, date) })
      qc.invalidateQueries({ queryKey: attendanceKeys.reports() })
      toast.success("Class day opened — you can mark attendance now.")
    },
    onError: (e) => reportError(e, "Couldn't open the day."),
  })
}

/** Clears all attendance for a day (wipes phantom rows on a holiday). */
export function useClearDay(classId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => attendanceApi.clearDay(classId, date),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: attendanceKeys.day(classId, date) })
      qc.invalidateQueries({ queryKey: attendanceKeys.reports() })
      toast.success(
        res.count > 0
          ? `Cleared ${res.count} record${res.count === 1 ? "" : "s"}.`
          : "Nothing to clear."
      )
    },
    onError: (e) => reportError(e, "Couldn't clear the day."),
  })
}

export function useAttendanceConfig() {
  return useQuery({
    queryKey: attendanceKeys.config(),
    queryFn: () => attendanceApi.getConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useSaveWeeklyOff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (weeklyOff: number[]) => attendanceApi.saveConfig(weeklyOff),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.config() })
      qc.invalidateQueries({ queryKey: attendanceKeys.days() })
      qc.invalidateQueries({ queryKey: attendanceKeys.reports() })
      toast.success("Weekly off saved.")
    },
    onError: (e) => reportError(e, "Couldn't save the weekly off."),
  })
}

export function useHolidays(month: string, classId?: string) {
  return useQuery({
    queryKey: attendanceKeys.holidays(month, classId ?? ""),
    queryFn: () => attendanceApi.listHolidays(month, classId),
    enabled: Boolean(month),
  })
}

export function useUpsertHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HolidayUpsertInput) => attendanceApi.upsertHoliday(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.holidayLists() })
      qc.invalidateQueries({ queryKey: attendanceKeys.days() })
      qc.invalidateQueries({ queryKey: attendanceKeys.reports() })
      toast.success("Holiday saved.")
    },
    onError: (e) => reportError(e, "Couldn't save the holiday."),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => attendanceApi.deleteHoliday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.holidayLists() })
      qc.invalidateQueries({ queryKey: attendanceKeys.days() })
      qc.invalidateQueries({ queryKey: attendanceKeys.reports() })
      toast.success("Holiday removed.")
    },
    onError: (e) => reportError(e, "Couldn't remove the holiday."),
  })
}
