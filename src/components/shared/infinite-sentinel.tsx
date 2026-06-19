"use client"

import { useEffect, useRef } from "react"

/** Invisible marker that triggers `onLoadMore` when it scrolls into view, with a
 *  small loading line. Pair with useInfiniteList for infinite-scroll lists. */
export function InfiniteSentinel({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !hasMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading) onLoadMore()
      },
      { rootMargin: "300px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  if (!hasMore) return null

  return (
    <div ref={ref} className="text-muted-foreground py-3 text-center text-xs">
      {isLoading ? "Loading more…" : ""}
    </div>
  )
}
