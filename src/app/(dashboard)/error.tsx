"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

// Catches any unexpected runtime error thrown while rendering a dashboard page
// (including a transient failure during a manual refresh) and shows a friendly
// recoverable screen instead of Next's raw "This page couldn't load" page.
// forbidden()/notFound() are NOT caught here — they route to forbidden.tsx /
// not-found.tsx, which is what we want.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the real error (with its digest) in the browser console / logs so
    // the redacted production screen still leaves a breadcrumb to debug from.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="bg-card w-full max-w-md space-y-4 rounded-2xl border p-8 text-center">
        <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
          <AlertTriangle className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            This page hit an unexpected error. Try again — if it keeps happening,
            refresh the app or head back to the dashboard.
          </p>
          {error.digest && (
            <p className="text-muted-foreground/70 font-mono text-[11px]">
              Ref: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
