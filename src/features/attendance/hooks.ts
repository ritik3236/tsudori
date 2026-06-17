"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { attendanceApi } from "./api"
import { attendanceKeys } from "./keys"
import type { DayAttendance } from "./types"
import type { BulkMarkInput, MarkAttendanceInput } from "./schema"

export { attendanceKeys }

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
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
      toast.error("Couldn't mark attendance.")
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
