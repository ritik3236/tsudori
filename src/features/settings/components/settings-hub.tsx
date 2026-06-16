import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { SettingsSection } from "@/features/settings/sections"

/**
 * iOS-style settings hub: a grouped list of category rows. Live rows link to
 * their sub-route; not-yet-built rows render disabled with a "Soon" badge. Pure
 * presentational — the page filters sections by permission before passing them.
 */
export function SettingsHub({ sections }: { sections: SettingsSection[] }) {
  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {sections.map((section) => {
        const Icon = section.icon
        const body = (
          <>
            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-medium">{section.label}</span>
                {section.comingSoon && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    Soon
                  </Badge>
                )}
              </span>
              <span className="text-muted-foreground mt-0.5 block truncate text-sm">
                {section.description}
              </span>
            </span>
            {!section.comingSoon && (
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            )}
          </>
        )

        const base = "flex items-center gap-3 px-4 py-3.5"

        return section.comingSoon ? (
          <div key={section.href} aria-disabled className={cn(base, "opacity-55")}>
            {body}
          </div>
        ) : (
          <Link
            key={section.href}
            href={section.href}
            className={cn(base, "transition-colors hover:bg-muted/50")}
          >
            {body}
          </Link>
        )
      })}
    </div>
  )
}
