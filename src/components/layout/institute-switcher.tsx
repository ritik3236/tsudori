"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { Check, ChevronsUpDown, Globe, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { InstituteMark } from "@/components/layout/institute-mark"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAllInstitutes } from "@/features/institute/hooks"
import { setActiveInstitute } from "@/features/institute/actions"
import type { InstituteOption } from "@/features/institute/types"

type Current = { id: string; name: string; logoUrl: string | null }

/**
 * Switches the active institute. A normal user picks among their memberships; a
 * super admin searches ALL institutes (lazy-loaded on open). When there's nothing
 * to switch to (single-institute normal user), it renders the name as plain text.
 */
export function InstituteSwitcher({
  current,
  myInstitutes,
  isSuperAdmin,
  triggerClassName,
}: {
  current: Current
  myInstitutes: InstituteOption[]
  isSuperAdmin: boolean
  triggerClassName?: string
}) {
  const switchable = isSuperAdmin || myInstitutes.length > 1
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [isPending, startTransition] = useTransition()

  // Super admin: all institutes, fetched only once the menu opens. Normal user:
  // their memberships, already on hand from the server.
  const { data: all, isLoading } = useAllInstitutes(isSuperAdmin && open)
  const list = useMemo(
    () => (isSuperAdmin ? (all ?? []) : myInstitutes),
    [isSuperAdmin, all, myInstitutes]
  )

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? list.filter((i) => i.name.toLowerCase().includes(t)) : list
  }, [list, q])

  if (!switchable) {
    return <span className={cn("truncate", triggerClassName)}>{current.name}</span>
  }

  function choose(id: string) {
    if (id === current.id) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      await setActiveInstitute(id) // server action redirects to /dashboard
    })
  }

  const showSearch = isSuperAdmin || list.length > 6

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={isPending}
            aria-label="Switch institute"
            className={cn(
              "flex items-center gap-1 truncate text-left disabled:opacity-50",
              triggerClassName
            )}
          >
            <span className="truncate">{current.name}</span>
            {isPending ? (
              <Loader2 className="size-3 shrink-0 animate-spin" />
            ) : (
              <ChevronsUpDown className="size-3 shrink-0 opacity-60" />
            )}
          </button>
        }
      />
      <PopoverContent align="start" className="w-64 p-0">
        {showSearch && (
          <div className="border-b p-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search institutes…"
              className="h-8"
              autoFocus
            />
          </div>
        )}
        <div className="max-h-72 overflow-y-auto p-1">
          {/* Super admins can step up to the cross-institute platform view. */}
          {isSuperAdmin && (
            <>
              <Link
                href="/platform"
                onClick={() => setOpen(false)}
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
              >
                <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-md">
                  <Globe className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">Platform</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    All institutes
                  </span>
                </span>
              </Link>
              <div className="bg-border my-1 h-px" />
            </>
          )}
          {isLoading ? (
            <p className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              No institutes
            </p>
          ) : (
            filtered.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => choose(i.id)}
                disabled={isPending}
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left disabled:opacity-50"
              >
                <InstituteMark logoUrl={i.logoUrl} className="size-6" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{i.name}</span>
                  {(i.roleName || i.status !== "ACTIVE") && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {i.status !== "ACTIVE" ? "Suspended" : i.roleName}
                    </span>
                  )}
                </span>
                {i.id === current.id && <Check className="size-4 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
