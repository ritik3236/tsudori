"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { THEMES } from "@/lib/themes"
import { FONTS } from "@/lib/fonts"
import { useFont } from "@/components/providers/font-provider"

// Theme + font pickers for the Settings → Appearance page. The same controls
// exist as quick icons in the nav; this is the fuller "main" home for them.
// Both are per-device (localStorage), so changes apply instantly without a save.
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const { font, setFont } = useFont()

  // theme/font resolve only on the client; gate the active highlight on mount to
  // avoid a hydration mismatch on the ring classes (SSR + first render show none).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag
    setMounted(true)
  }, [])

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium">Theme</h2>
          <p className="text-muted-foreground text-sm">
            Colour palette for the app on this device.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = mounted && theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={cn(
                  "bg-card flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50",
                  active && "border-primary ring-primary ring-2"
                )}
              >
                <span
                  className="ring-foreground/15 size-5 shrink-0 rounded-full ring-1"
                  style={{ background: t.swatch }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {t.label}
                </span>
                {active && <Check className="text-primary size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium">Font</h2>
          <p className="text-muted-foreground text-sm">
            Typeface for the app on this device.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {FONTS.map((f) => {
            const active = mounted && font === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFont(f.value)}
                className={cn(
                  "bg-card flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50",
                  active && "border-primary ring-primary ring-2"
                )}
              >
                <span
                  className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg text-base font-medium"
                  style={{ fontFamily: f.stack }}
                >
                  Aa
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium"
                    style={{ fontFamily: f.stack }}
                  >
                    {f.label}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {f.note ?? "Aa Bb Cc 0123456789"}
                  </span>
                </span>
                {active && <Check className="text-primary size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
