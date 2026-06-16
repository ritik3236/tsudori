import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"

type ModulePlaceholderProps = {
  title: string
  description: string
  icon: LucideIcon
  /** What this module will do — mirrors the V1 spec so the roadmap is visible. */
  features: string[]
}

/**
 * Stand-in for a planned module. Each one is a vertical slice waiting to be built
 * the same way Student Management was (schema → service → API → hooks → UI).
 */
export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  features,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="secondary">Coming soon</Badge>}
      />
      <EmptyState
        icon={Icon}
        title={`${title} is on the roadmap`}
        description="This module is scaffolded in the navigation and will be built as a vertical slice mirroring Student Management."
        action={
          <ul className="text-muted-foreground mx-auto max-w-sm space-y-1.5 text-left text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="bg-muted-foreground/40 mt-2 size-1.5 shrink-0 rounded-full" />
                {f}
              </li>
            ))}
          </ul>
        }
      />
    </div>
  )
}
