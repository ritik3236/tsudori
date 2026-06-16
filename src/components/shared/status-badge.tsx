import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const TONES = {
  active: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  inactive: "border-transparent bg-muted text-muted-foreground",
} as const

export function StatusBadge({ active, className }: { active: boolean; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(active ? TONES.active : TONES.inactive, className)}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}
