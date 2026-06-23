import type { Metadata } from "next"
import { Users } from "lucide-react"

import { formatDateShort, getInitials } from "@/lib/format"
import { getSuperAdminContext } from "@/lib/tenant"
import { listPlatformMembers } from "@/features/platform/service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = { title: "Members" }

export default async function PlatformMembersPage() {
  const ctx = await getSuperAdminContext()
  const members = await listPlatformMembers(ctx)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground text-sm">
          {members.length} {members.length === 1 ? "member" : "members"} across all institutes.
        </p>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Members appear here once institutes invite their team."
        />
      ) : (
        <>
          {/* Desktop: a dense table. Hidden on mobile where the columns would
              force a horizontal scroll. */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.membershipId}>
                    <TableCell>
                      <Identity name={m.name} image={m.image} email={m.email} />
                    </TableCell>
                    <TableCell className="text-sm">{m.instituteName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.roleName}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDateShort(m.joinedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: each member as a compact card. */}
          <div className="space-y-2.5 md:hidden">
            {members.map((m) => (
              <div key={m.membershipId} className="bg-card rounded-xl border p-3.5">
                <Identity name={m.name} image={m.image} email={m.email} />
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span className="text-foreground/70 font-medium">{m.instituteName}</span>
                  <span>· {m.roleName}</span>
                  <span className="tabular-nums">· {formatDateShort(m.joinedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Identity({
  name,
  image,
  email,
}: {
  name: string
  image: string | null
  email: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        {image && <AvatarImage src={image} alt={name} className="object-cover" />}
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-muted-foreground truncate text-xs">{email}</div>
      </div>
    </div>
  )
}
