import type { ReportId } from "./registry"

export type { ReportId }

export type ValueFormat = "currency" | "number" | "percent"

export type ReportParams = { monthsBack?: number; month?: string }

/** A validated, defaults-applied report request. */
export type ReportConfig = { reportId: ReportId; params: ReportParams }

export type ReportKpi = { label: string; value: number; format: ValueFormat }

export type ReportSeries = { name: string; color: string; data: number[] }

export type ReportChart = {
  type: "bar"
  categories: string[]
  series: ReportSeries[]
  valueFormat: ValueFormat
}

export type ReportColumn = {
  label: string
  format: ValueFormat | "text"
  align: "left" | "right"
}

export type ReportTable = {
  columns: ReportColumn[]
  rows: (string | number)[][]
  /** Row to emphasise as a total, or null. */
  totalRowIndex: number | null
}

/** What execute returns and the client renders. Numbers stay raw; the client
 *  formats them with the app's formatters so reports match the rest of the UI. */
export type ReportResult = {
  reportId: ReportId
  title: string
  /** The parsed config, shown as "AI understood …" chips. */
  configChips: string[]
  kpis: ReportKpi[]
  chart: ReportChart | null
  table: ReportTable
  defaultViz: "chart" | "table"
  generatedAt: string
  /** "ai" when produced from a prompt, "direct" when a known report was run. */
  source: "ai" | "direct"
}
