"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { revalidateAllPaths } from "@/app/actions/revalidate"

// Header icon-button that refreshes the current view: purges the server cache,
// refetches the client (TanStack Query) cache, and re-pulls the RSC payload — so
// both server-rendered pages and the query-driven list pages get fresh data.
export function RefreshButton() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [spinning, setSpinning] = useState(false)

  function handleClick() {
    setSpinning(true)
    startTransition(async () => {
      try {
        await revalidateAllPaths()
        await queryClient.invalidateQueries()
        router.refresh()
      } catch (error) {
        // A failed refresh should never blow up the page — just log it and let
        // the user try again. The visible data simply stays as-is.
        console.error("[refresh] failed to refresh data", error)
      } finally {
        // Keep the spin going briefly so fast/cached refreshes don't just flash.
        setTimeout(() => setSpinning(false), 600)
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Refresh"
      className="text-muted-foreground border-0"
    >
      <RefreshCw className={cn(spinning && "animate-spin")} />
    </Button>
  )
}
