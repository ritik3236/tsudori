"use client"

import { useTransition } from "react"
import { Loader2, LogIn } from "lucide-react"
import type { InstituteStatus } from "@prisma/client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { setActiveInstitute } from "@/features/institute/actions"

/** Enters an institute (Phase 1's switch action: sets the cookie + redirects to
 *  its /dashboard). With no `label` it renders the institute name as a plain
 *  text link (list-row use); pass `label` to render it as a proper CTA button
 *  — e.g. "Enter institute" on the detail page header (peers with Suspend). */
export function EnterInstituteButton({
  id,
  name,
  status,
  label,
}: {
  id: string
  name: string
  status: InstituteStatus
  label?: string
}) {
  const [isPending, startTransition] = useTransition()
  const enter = () =>
    startTransition(async () => {
      await setActiveInstitute(id)
    })

  if (label) {
    return (
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={enter}>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        {label}
      </Button>
    )
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={enter}
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
