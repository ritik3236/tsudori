// The canonical report catalog — the closed set the AI may emit and the builder
// can run directly. Pure module (no Prisma / server-only), so both the client UI
// and the server service share one source of truth. Execution lives in service.ts.
import { PERMISSIONS, type Permission } from "@/lib/rbac"

export const REPORT_ID_VALUES = [
  "fee-collection-trend",
  "collection-by-class",
  "attendance-summary",
] as const

export type ReportId = (typeof REPORT_ID_VALUES)[number]

// Series colours, shared by the chart and its legend. Mid-ramp hexes that read
// in both light and dark mode (collected=purple, expected=gray, outstanding=amber,
// present=teal) — chosen so colour encodes meaning, not sequence.
export const REPORT_COLORS = {
  collected: "#7F77DD",
  expected: "#B4B2A9",
  outstanding: "#EF9F27",
  present: "#1D9E75",
} as const

type ReportMeta = {
  label: string
  /** Shown to the model so it can pick the right report. */
  description: string
  /** Enforced in executeReport — a fee report needs fee:read, etc. */
  requiredPermission: Permission
  defaultViz: "chart" | "table"
}

export const REPORTS: Record<ReportId, ReportMeta> = {
  "fee-collection-trend": {
    label: "Fee collection trend",
    description: "Collected vs expected fees over the last N months (1–6).",
    requiredPermission: PERMISSIONS.FEE_READ,
    defaultViz: "chart",
  },
  "collection-by-class": {
    label: "Collection / outstanding by class",
    description: "Per-class collected and outstanding fees for a given month.",
    requiredPermission: PERMISSIONS.FEE_READ,
    defaultViz: "chart",
  },
  "attendance-summary": {
    label: "Attendance summary",
    description: "Present % and absences by class for a given month.",
    requiredPermission: PERMISSIONS.ATTENDANCE_READ,
    defaultViz: "chart",
  },
}

/** Starter chips in the builder — run directly (no AI call) when clicked. */
export const STARTER_REPORTS: { reportId: ReportId; label: string }[] = [
  { reportId: "fee-collection-trend", label: "Fee collection trend" },
  { reportId: "collection-by-class", label: "Outstanding by class" },
  { reportId: "attendance-summary", label: "Attendance summary" },
]
