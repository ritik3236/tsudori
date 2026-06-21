import { z } from "zod"

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LEAVE"] as const

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
const monthString = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM")

export const markAttendanceSchema = z.object({
  studentId: z.string().trim().min(1),
  date: dateString,
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().trim().max(200).nullish(),
})

export const bulkMarkSchema = z.object({
  classId: z.string().trim().min(1),
  date: dateString,
  records: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        status: z.enum(ATTENDANCE_STATUSES),
        note: z.string().trim().max(200).nullish(),
      })
    )
    .min(1),
})

export const dayQuerySchema = z.object({
  classId: z.string().trim().min(1),
  date: dateString,
})

export const reportQuerySchema = z.object({
  classId: z.string().trim().min(1),
  month: monthString,
})

// ─── Holidays / working-day config ─────────────────────────────────────────────

export const HOLIDAY_KINDS = ["OFF", "WORKING"] as const

/** Weekly-off as Luxon weekdays (1=Mon..7=Sun). Empty = no weekly off. */
export const weeklyOffSchema = z.object({
  weeklyOff: z.array(z.number().int().min(1).max(7)).max(7),
})

export const holidayQuerySchema = z.object({
  month: monthString,
  // Optional class scope; omitted = institute-wide rows only.
  classId: z.string().trim().min(1).optional(),
})

export const holidayUpsertSchema = z.object({
  classId: z.string().trim().min(1).nullish(),
  date: dateString,
  kind: z.enum(HOLIDAY_KINDS),
  name: z.string().trim().max(80).nullish(),
})

/** "Hold class today" / "Clear this day" — operate on one (class?, date). */
export const dayActionSchema = z.object({
  classId: z.string().trim().min(1),
  date: dateString,
})

export type WeeklyOffInput = z.infer<typeof weeklyOffSchema>
export type HolidayUpsertInput = z.infer<typeof holidayUpsertSchema>
export type DayActionInput = z.infer<typeof dayActionSchema>
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>
export type BulkMarkInput = z.infer<typeof bulkMarkSchema>
