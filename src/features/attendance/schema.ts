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

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>
export type BulkMarkInput = z.infer<typeof bulkMarkSchema>
