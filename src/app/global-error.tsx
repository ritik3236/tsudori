"use client"

import { useEffect } from "react"

// Last-resort boundary: catches errors thrown in the root layout itself, where
// the segment-level error.tsx can't reach. It replaces the whole document, so it
// must render its own <html>/<body>. Kept dependency-free and self-styled so it
// works even if app providers are the thing that failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="ge-body">
        {/* Self-contained styles (incl. dark mode) — this boundary deliberately
            renders without the app's stylesheet/providers, since they may be the
            thing that failed. */}
        <style>{`
          .ge-body {
            margin: 0; min-height: 100vh; display: flex;
            align-items: center; justify-content: center; padding: 1rem;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            background: #fafafa; color: #0a0a0a;
          }
          .ge-card {
            max-width: 26rem; width: 100%; text-align: center;
            border: 1px solid #e5e5e5; border-radius: 1rem; background: #fff; padding: 2rem;
          }
          .ge-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
          .ge-text { font-size: 0.875rem; color: #737373; margin: 0 0 1.25rem; }
          .ge-btn {
            cursor: pointer; border: none; border-radius: 0.5rem; padding: 0.5rem 1rem;
            font-size: 0.875rem; font-weight: 500; background: #0a0a0a; color: #fff;
          }
          @media (prefers-color-scheme: dark) {
            .ge-body { background: #0a0a0a; color: #fafafa; }
            .ge-card { border-color: #262626; background: #171717; }
            .ge-text { color: #a3a3a3; }
            .ge-btn { background: #fafafa; color: #0a0a0a; }
          }
        `}</style>
        <div className="ge-card">
          <h1 className="ge-title">Something went wrong</h1>
          <p className="ge-text">
            The app hit an unexpected error. Please try again.
          </p>
          <button type="button" onClick={reset} className="ge-btn">
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
