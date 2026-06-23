import Link from "next/link"
import type { InstituteStatus } from "@prisma/client"

import { Badge } from "@/components/ui/badge"

/** A row's institute name — links to its platform detail page. Entering the
 *  institute (the cookie switch) now lives on that detail page. */
export function InstituteNameLink({
  id,
  name,
  status,
}: {
  id: string
  name: string
  status: InstituteStatus
}) {
  return (
    <Link
      href={`/platform/institutes/${id}`}
      className="flex items-center gap-2 text-left font-medium hover:underline"
    >
      <span className="truncate">{name}</span>
      {status !== "ACTIVE" && (
        <Badge variant="secondary" className="font-normal">
          Suspended
        </Badge>
      )}
    </Link>
  )
}
