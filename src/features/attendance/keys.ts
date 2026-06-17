// Query-key factory. Lives in its own pure module (attendance/api.ts is a
// "use client" module) so server components can import it for prefetch without
// crossing the client boundary.
export const attendanceKeys = {
  all: ["attendance"] as const,
  days: () => [...attendanceKeys.all, "day"] as const,
  day: (classId: string, date: string) =>
    [...attendanceKeys.days(), classId, date] as const,
  reports: () => [...attendanceKeys.all, "report"] as const,
  report: (classId: string, month: string) =>
    [...attendanceKeys.reports(), classId, month] as const,
}
