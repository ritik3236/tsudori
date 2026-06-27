"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/http"
import { Button } from "@/components/ui/button"
import { STARTER_REPORTS } from "../registry"
import { useRunReport } from "../hooks"
import { ReportView } from "./report-view"
import type { ReportRequest } from "../schema"

export function ReportBuilder() {
  const [prompt, setPrompt] = useState("")
  const run = useRunReport()
  const lastReq = useRef<ReportRequest | null>(null)

  const submit = (req: ReportRequest) => {
    lastReq.current = req
    run.mutate(req)
  }

  // Land on something useful: run the fee-collection trend once on mount.
  useEffect(() => {
    submit({ reportId: "fee-collection-trend" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onGenerate = () => {
    const p = prompt.trim()
    if (p) submit({ prompt: p })
  }

  const result = run.data
  const activeId = result?.reportId

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="bg-card focus-within:border-ring flex flex-1 items-center gap-2 rounded-2xl border px-3 transition-colors">
          <Sparkles className="size-4 shrink-0 text-violet-500" />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onGenerate()}
            placeholder="Ask for a report…"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <Button
          onClick={onGenerate}
          disabled={run.isPending || !prompt.trim()}
          className="rounded-2xl"
        >
          Generate
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STARTER_REPORTS.map((s) => (
          <button
            key={s.reportId}
            type="button"
            onClick={() => {
              setPrompt("")
              submit({ reportId: s.reportId })
            }}
            disabled={run.isPending}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-60",
              activeId === s.reportId
                ? "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {result ? (
        <ReportView
          key={result.reportId}
          result={result}
          onRegenerate={() => lastReq.current && submit(lastReq.current)}
          busy={run.isPending}
        />
      ) : run.isError ? (
        <ErrorBox error={run.error} />
      ) : (
        <ReportSkeleton />
      )}
    </div>
  )
}

function ErrorBox({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError ? error.message : "Couldn't build that report."
  return (
    <div className="bg-muted/50 flex items-start gap-3 rounded-[16px] p-5">
      <AlertCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="card-soft bg-card space-y-4 rounded-[16px] p-5">
      <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted/60 h-16 animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-[220px] animate-pulse rounded-xl" />
    </div>
  )
}
