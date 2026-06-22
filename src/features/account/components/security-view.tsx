"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Laptop } from "lucide-react"

import { authClient } from "@/lib/auth/client"
import { formatDateTime, formatRelative } from "@/lib/date-helper"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChangePasswordDialog } from "@/features/account/components/change-password-dialog"

type SessionRow = {
  id: string
  token: string
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string | Date
}

const SESSIONS_KEY = ["account", "sessions"] as const

// Best-effort, dependency-free user-agent → "Browser · OS". Good enough to tell
// devices apart; not meant to be exhaustive.
function deviceLabel(ua?: string | null): string {
  if (!ua) return "Unknown device"
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /OPR|Opera/.test(ua)
      ? "Opera"
      : /Chrome|CriOS/.test(ua)
        ? "Chrome"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /Safari/.test(ua)
            ? "Safari"
            : "Browser"
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : ""
  return os ? `${browser} · ${os}` : browser
}

export function SecurityView() {
  const qc = useQueryClient()
  const { data: sessionData } = authClient.useSession()
  const currentToken = sessionData?.session?.token

  const { data: sessions, isLoading } = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const { data, error } = await authClient.listSessions()
      if (error) throw new Error(error.message || "Couldn't load your sessions.")
      return (data ?? []) as SessionRow[]
    },
  })

  // token being revoked, or "all" for revoke-others — disables the controls.
  const [busy, setBusy] = useState<string | null>(null)

  async function revokeOne(token: string) {
    setBusy(token)
    try {
      const { error } = await authClient.revokeSession({ token })
      if (error) {
        toast.error(error.message || "Couldn't sign out that device.")
        return
      }
      toast.success("Signed out that device.")
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
    } finally {
      setBusy(null)
    }
  }

  async function revokeOthers() {
    setBusy("all")
    try {
      const { error } = await authClient.revokeOtherSessions()
      if (error) {
        toast.error(error.message || "Couldn't sign out your other devices.")
        return
      }
      toast.success("Signed out of all other devices.")
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
    } finally {
      setBusy(null)
    }
  }

  // Current device first, then newest.
  const rows = [...(sessions ?? [])].sort((a, b) => {
    if (a.token === currentToken) return -1
    if (b.token === currentToken) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  const otherCount = rows.filter((s) => s.token !== currentToken).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Devices currently signed in to your account. See one you don&apos;t
            recognise? Sign it out and change your password.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[58px] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {rows.map((s) => {
                const isCurrent = s.token === currentToken
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Laptop className="text-muted-foreground size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {deviceLabel(s.userAgent)}
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px]">
                            This device
                          </Badge>
                        )}
                      </p>
                      <p
                        className="text-muted-foreground truncate text-xs"
                        title={formatDateTime(s.createdAt)}
                      >
                        {s.ipAddress || "Unknown IP"} · {formatRelative(s.createdAt)}
                      </p>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeOne(s.token)}
                        disabled={busy !== null}
                      >
                        {busy === s.token ? "Signing out…" : "Sign out"}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {otherCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={revokeOthers}
                disabled={busy !== null}
              >
                {busy === "all" ? "Signing out…" : "Sign out of all other devices"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Change your account password — the option to sign out of other devices
            is offered there too.
          </p>
          <ChangePasswordDialog />
        </CardContent>
      </Card>
    </div>
  )
}
