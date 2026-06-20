"use client"

import { Type, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FONTS } from "@/lib/fonts"
import { useFont } from "@/components/providers/font-provider"

// Header icon-button that opens the font picker. Each row is rendered in its own
// typeface so the choice is a live preview. Mirrors ThemeSelector.
export function FontSelector() {
  const { font, setFont } = useFont()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change font"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground border-0"
        )}
      >
        <Type className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="text-muted-foreground px-1.5 py-1 text-xs font-medium">Font</div>
        {FONTS.map((f) => (
          <DropdownMenuItem
            key={f.value}
            onClick={() => setFont(f.value)}
            className="gap-2"
          >
            <span className="flex-1 truncate" style={{ fontFamily: f.stack }}>
              {f.label}
            </span>
            {font === f.value && <Check className="size-4 shrink-0 opacity-70" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
