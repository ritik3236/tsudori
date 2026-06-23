"use client"

import { useTransition } from "react"
import { Loader2, Pause, Play } from "lucide-react"
import type { InstituteStatus } from "@prisma/client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { setInstituteStatus } from "@/features/platform/actions"

/** Per-row Suspend ↔ Reactivate toggle (super-admin only, audited server-side). */
export function InstituteStatusToggle({
  id,
  status,
}: {
  id: string
  status: InstituteStatus
}) {
  const [isPending, startTransition] = useTransition()
  const next: InstituteStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"

  function toggle() {
    startTransition(async () => {
      try {
        await setInstituteStatus(id, next)
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Couldn't update the institute."
        )
      }
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={toggle}
      className={
        status === "ACTIVE"
          ? "text-destructive hover:text-destructive"
          : undefined
      }
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : status === "ACTIVE" ? (
        <Pause className="size-4" />
      ) : (
        <Play className="size-4" />
      )}
      {status === "ACTIVE" ? "Suspend" : "Reactivate"}
    </Button>
  )
}
