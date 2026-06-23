"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import type { InstituteStatus } from "@prisma/client"

import { Badge } from "@/components/ui/badge"
import { setActiveInstitute } from "@/features/institute/actions"

/** A row's institute name — clicking enters that institute (Phase 1's switch
 *  action sets the cookie + redirects to its /dashboard). */
export function EnterInstituteButton({
  id,
  name,
  status,
}: {
  id: string
  name: string
  status: InstituteStatus
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await setActiveInstitute(id) })}
      className="flex items-center gap-2 text-left font-medium hover:underline disabled:opacity-60"
    >
      <span className="truncate">{name}</span>
      {status !== "ACTIVE" && (
        <Badge variant="secondary" className="font-normal">
          Suspended
        </Badge>
      )}
      {isPending && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
    </button>
  )
}
