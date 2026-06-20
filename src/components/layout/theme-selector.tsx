"use client"

import { Palette, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { THEMES } from "@/lib/themes"
import { saveMyAppearance } from "@/features/appearance/actions"

// Header icon-button that opens the theme picker. Each row shows the theme's
// accent dot, its name, and a check on the active one. The fuller theme + font
// home is Settings → Appearance; this is the nav quick-switch.
export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change theme"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground border-0"
        )}
      >
        <Palette className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="text-muted-foreground px-1.5 py-1 text-xs font-medium">Theme</div>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => {
              setTheme(t.value)
              void saveMyAppearance({ theme: t.value }).catch(() => {})
            }}
            className="gap-2"
          >
            <span
              className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15"
              style={{ background: t.swatch }}
            />
            <span className="flex-1">{t.label}</span>
            {theme === t.value && <Check className="size-4 opacity-70" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
