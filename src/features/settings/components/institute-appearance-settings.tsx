"use client"

import { useState, useTransition } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { THEMES } from "@/lib/themes"
import { FONTS } from "@/lib/fonts"
import { saveInstituteAppearanceAction } from "@/features/appearance/actions"

// Admin picker for the institute's DEFAULT theme/font — what members who haven't
// chosen their own inherit. Unlike the personal picker, selecting here does NOT
// change the admin's own live view; it just saves the house default.
export function InstituteAppearanceSettings({
  current,
}: {
  current: { theme: string | null; font: string | null }
}) {
  const [theme, setTheme] = useState<string | null>(current.theme)
  const [font, setFont] = useState<string | null>(current.font)
  const [, startTransition] = useTransition()

  function save(input: { theme?: string; font?: string }, label: string) {
    startTransition(async () => {
      try {
        await saveInstituteAppearanceAction(input)
        toast.success(`Institute default ${label} saved.`)
      } catch {
        toast.error("Couldn't save the institute default.")
      }
    })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium">Default theme</h2>
          <p className="text-muted-foreground text-sm">
            Members without their own theme see this.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTheme(t.value)
                  save({ theme: t.value }, "theme")
                }}
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
          <h2 className="text-sm font-medium">Default font</h2>
          <p className="text-muted-foreground text-sm">
            Members without their own font see this.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {FONTS.map((f) => {
            const active = font === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setFont(f.value)
                  save({ font: f.value }, "font")
                }}
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
