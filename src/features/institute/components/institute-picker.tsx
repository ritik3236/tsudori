"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronRight, Loader2 } from "lucide-react"

import { InstituteMark } from "@/components/layout/institute-mark"
import { Input } from "@/components/ui/input"
import { useAllInstitutes } from "@/features/institute/hooks"
import { setActiveInstitute } from "@/features/institute/actions"
import type { InstituteOption } from "@/features/institute/types"

/**
 * Post-login institute chooser. A normal user picks among their memberships; a
 * super admin searches ALL institutes. Selecting calls setActiveInstitute, which
 * sets the cookie and redirects to /dashboard.
 */
export function InstitutePicker({
  myInstitutes,
  isSuperAdmin,
}: {
  myInstitutes: InstituteOption[]
  isSuperAdmin: boolean
}) {
  const [q, setQ] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { data: all, isLoading } = useAllInstitutes(isSuperAdmin)
  const list = useMemo(
    () => (isSuperAdmin ? (all ?? []) : myInstitutes),
    [isSuperAdmin, all, myInstitutes]
  )

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? list.filter((i) => i.name.toLowerCase().includes(t)) : list
  }, [list, q])

  function choose(id: string) {
    setPendingId(id)
    startTransition(async () => {
      await setActiveInstitute(id) // redirects to /dashboard
    })
  }

  return (
    <div className="space-y-3">
      {(isSuperAdmin || list.length > 6) && (
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search institutes…"
          autoFocus
        />
      )}

      {isLoading ? (
        <div className="text-muted-foreground flex justify-center py-10">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          No institutes found.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {filtered.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => choose(i.id)}
                disabled={isPending}
                className="hover:bg-muted flex w-full items-center gap-3 px-3 py-3 text-left disabled:opacity-60"
              >
                <InstituteMark logoUrl={i.logoUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.name}</span>
                  {(i.roleName || i.status !== "ACTIVE") && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {i.status !== "ACTIVE" ? "Suspended" : i.roleName}
                    </span>
                  )}
                </span>
                {pendingId === i.id && isPending ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
