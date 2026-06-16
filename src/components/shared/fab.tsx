import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type FabProps = {
  href: string
  label: string
  icon: LucideIcon
  className?: string
}

// Mobile-only floating action button for a screen's single primary action.
// Parked in the bottom-right thumb zone, lifted clear of the bottom nav + the
// home-indicator safe area. Desktop keeps the in-header action instead (lg:hidden).
export function Fab({ href, label, icon: Icon, className }: FabProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "bg-primary text-primary-foreground fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 flex size-14 items-center justify-center rounded-full shadow-lg ring-1 ring-foreground/10 transition-transform active:scale-95 lg:hidden",
        className
      )}
    >
      <Icon className="size-6" />
    </Link>
  )
}
