"use client"

import { useState } from "react"
import { ChartColumnBig, RefreshCw, Table as TableIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import { formatRelative } from "@/lib/date-helper"
import { ReportChart } from "./report-chart"
import type { ReportResult, ValueFormat } from "../types"

function formatValue(v: number, f: ValueFormat, compact = false): string {
  if (f === "currency") return formatCurrency(v, { compact })
  if (f === "percent") return `${Math.round(v)}%`
  return v.toLocaleString("en-IN")
}

function formatCell(v: string | number, f: ValueFormat | "text"): string {
  if (typeof v === "string" || f === "text") return String(v)
  return formatValue(v, f)
}

export function ReportView({
  result,
  onRegenerate,
  busy,
}: {
  result: ReportResult
  onRegenerate: () => void
  busy: boolean
}) {
  // Initialised per report; the parent keys this component on reportId, so
  // switching reports remounts and resets to that report's default view, while a
  // regenerate of the same report preserves the chosen chart/table toggle.
  const [viz, setViz] = useState<"chart" | "table">(result.defaultViz)

  const hasChart = result.chart !== null

  return (
    <section className="card-soft bg-card rounded-[16px] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground/80 text-xs">AI understood</span>
          {result.configChips.map((c) => (
            <span
              key={c}
              className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
            >
              {c}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          aria-label="Regenerate"
          title="Regenerate"
          className="text-muted-foreground hover:text-foreground hover:bg-muted -mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
        </button>
      </div>

      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{result.title}</h2>
        {hasChart && (
          <div className="bg-muted/60 flex shrink-0 rounded-lg p-0.5">
            <ToggleButton active={viz === "chart"} onClick={() => setViz("chart")} icon={ChartColumnBig} label="Chart" />
            <ToggleButton active={viz === "table"} onClick={() => setViz("table")} icon={TableIcon} label="Table" />
          </div>
        )}
      </div>

      <div className="mt-3 mb-4 grid grid-cols-3 gap-3">
        {result.kpis.map((k) => (
          <div key={k.label} className="bg-muted/50 rounded-xl p-3">
            <p className="text-muted-foreground text-xs">{k.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums sm:text-xl">
              {formatValue(k.value, k.format, k.format === "currency")}
            </p>
          </div>
        ))}
      </div>

      {viz === "chart" && result.chart ? (
        <>
          <div className="mb-1 flex justify-end gap-3.5">
            {result.chart.series.map((s) => (
              <span
                key={s.name}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
          <ReportChart chart={result.chart} />
        </>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {result.table.columns.map((c) => (
                  <th
                    key={c.label}
                    className={cn(
                      "text-muted-foreground border-border/60 border-b px-2 py-2 font-normal",
                      c.align === "right" ? "text-right" : "text-left"
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={cn(ri === result.table.totalRowIndex && "font-medium")}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        "border-border/50 border-b px-2 py-2 tabular-nums",
                        result.table.columns[ci]?.align === "right"
                          ? "text-right"
                          : "text-left"
                      )}
                    >
                      {formatCell(cell, result.table.columns[ci]?.format ?? "text")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground/80 mt-4 text-[11px]">
        {result.source === "ai" ? "Built by Gemini 2.5 Flash · " : ""}
        {formatRelative(result.generatedAt)}
      </p>
    </section>
  )
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}
