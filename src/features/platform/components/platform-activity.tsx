import { AUDIT_ACTION_LABEL } from "@/features/audit/labels"
import { formatRelative } from "@/lib/date-helper"
import { getInitials } from "@/lib/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { PlatformActivityItem } from "@/features/platform/service"

/** Recent audit rows as a compact timeline. Shared by the platform dashboard
 *  (cross-tenant) and the institute detail page; `showInstitute` is dropped on
 *  the single-institute view where the owning institute is redundant. */
export function PlatformActivity({
  items,
  showInstitute = true,
}: {
  items: PlatformActivityItem[]
  showInstitute?: boolean
}) {
  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((a) => (
        <div key={a.id} className="flex items-center gap-2.5 px-3 py-2.5">
          <Avatar className="size-7 shrink-0">
            {a.actorImage && (
              <AvatarImage src={a.actorImage} alt="" className="object-cover" />
            )}
            <AvatarFallback className="text-[10px]">
              {a.actorName ? getInitials(a.actorName) : "?"}
            </AvatarFallback>
          </Avatar>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium">{a.actorName ?? "Someone"}</span>{" "}
            <span className="text-muted-foreground">
              {AUDIT_ACTION_LABEL[a.action] ?? a.action}
            </span>
            {showInstitute && a.instituteName && (
              <span className="text-muted-foreground"> · {a.instituteName}</span>
            )}
          </p>
          <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
            {formatRelative(a.createdAt)}
          </span>
        </div>
      ))}
    </div>
  )
}
