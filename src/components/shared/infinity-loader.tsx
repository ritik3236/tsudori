import { cn } from "@/lib/utils"

// A lemniscate (∞) with a violet dot tracing the loop. Pure SVG/SMIL — animates
// with no JavaScript, so it works as a server-rendered loading fallback.
// The same path string draws the track and drives the dot's motion.
const TRACK =
  "M50 25 C42 11 23 11 23 25 C23 39 42 39 50 25 C58 11 77 11 77 25 C77 39 58 39 50 25 Z"

export function InfinityLoader({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 50"
      fill="none"
      role="status"
      aria-label="Loading"
      className={cn("w-20", className)}
    >
      {/* Track */}
      <path
        d={TRACK}
        className="stroke-foreground/15"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Tracing dot with a soft halo */}
      <g>
        <circle r="9" className="fill-violet-500/25" />
        <circle r="5" className="fill-violet-500" />
        <animateMotion
          dur="1.3s"
          repeatCount="indefinite"
          calcMode="linear"
          path={TRACK}
        />
      </g>
    </svg>
  )
}
