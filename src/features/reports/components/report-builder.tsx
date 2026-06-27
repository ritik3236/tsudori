"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Mic, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/http"
import { useSpeechInput } from "@/lib/use-speech-input"
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

  // Voice-to-text fills the prompt as the user speaks; they review, then send
  // (no auto-submit — a mis-hear shouldn't run the wrong report).
  const voice = useSpeechInput({
    onTranscript: setPrompt,
    onError: (err) => {
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error("Microphone access is blocked — enable it in your browser settings.")
      } else if (err === "no-speech") {
        toast("Didn't catch that. Try again.")
      }
    },
  })

  const onGenerate = () => {
    voice.stop()
    const p = prompt.trim()
    if (p) submit({ prompt: p })
  }

  const result = run.data
  const activeId = result?.reportId

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="bg-card focus-within:border-ring flex h-10 flex-1 items-center gap-2 rounded-2xl border px-3 transition-colors sm:h-8">
          <Sparkles className="size-4 shrink-0 text-violet-500" />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onGenerate()}
            placeholder={voice.listening ? "Listening…" : "Ask for a report…"}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={voice.toggle}
              aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={voice.listening}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                voice.listening
                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Mic className={cn("size-4", voice.listening && "animate-pulse")} />
            </button>
          )}
        </div>
        <Button
          onClick={onGenerate}
          disabled={run.isPending || !prompt.trim()}
          className="h-10 rounded-2xl"
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
