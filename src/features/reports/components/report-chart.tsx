"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatCurrency } from "@/lib/format"
import type { ReportChart as ReportChartSpec, ValueFormat } from "../types"

function formatValue(v: number, f: ValueFormat, compact = false): string {
  if (f === "currency") return formatCurrency(v, { compact })
  if (f === "percent") return `${Math.round(v)}%`
  return v.toLocaleString("en-IN")
}

type TooltipEntry = { dataKey?: string | number; value?: number; color?: string }

function ChartTooltip({
  active,
  payload,
  label,
  valueFormat,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  valueFormat: ValueFormat
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="border-border bg-popover rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="text-foreground mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-muted-foreground flex items-center gap-2">
          <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
          {p.dataKey}:
          <span className="text-foreground font-medium">
            {formatValue(Number(p.value ?? 0), valueFormat)}
          </span>
        </p>
      ))}
    </div>
  )
}

export function ReportChart({ chart }: { chart: ReportChartSpec }) {
  const data = chart.categories.map((cat, i) => {
    const row: Record<string, string | number> = { name: cat }
    for (const s of chart.series) row[s.name] = s.data[i] ?? 0
    return row
  })

  return (
    <div className="text-muted-foreground h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            dy={4}
            tick={{ fill: "currentColor", fontSize: 12 }}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "currentColor", fontSize: 11 }}
            tickFormatter={(v) => formatValue(Number(v), chart.valueFormat, true)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={<ChartTooltip valueFormat={chart.valueFormat} />}
          />
          {chart.series.map((s) => (
            <Bar key={s.name} dataKey={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={44} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
