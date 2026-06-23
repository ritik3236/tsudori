import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ShieldCheck, Ticket, Users, Wallet } from "lucide-react"

import { formatCurrency, formatDateShort, getInitials } from "@/lib/format"
import { getSuperAdminContext } from "@/lib/tenant"
import {
  getInstituteDetail,
  listPlatformMembers,
  getPlatformActivity,
} from "@/features/platform/service"
import { StatCard } from "@/features/platform/components/stat-card"
import { PlatformActivity } from "@/features/platform/components/platform-activity"
import { EnterInstituteButton } from "@/features/platform/components/enter-institute-button"
import { InstituteStatusToggle } from "@/features/platform/components/institute-status-toggle"
import { BackLink } from "@/components/shared/back-link"
import { Badge } from "@/components/ui/badge"
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

export const metadata: Metadata = { title: "Institute" }

export default async function InstituteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getSuperAdminContext()
  const institute = await getInstituteDetail(ctx, id)
  if (!institute) notFound()

  const [members, activity] = await Promise.all([
    listPlatformMembers(ctx, id),
    getPlatformActivity(ctx, 10, id),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/platform/institutes" label="Institutes" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-14 rounded-xl">
            {institute.logoUrl && (
              <AvatarImage
                src={institute.logoUrl}
                alt={institute.name}
                className="object-cover"
              />
            )}
            <AvatarFallback className="rounded-xl text-base font-semibold">
              {getInitials(institute.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{institute.name}</h1>
              {institute.status !== "ACTIVE" && (
                <Badge variant="secondary">Suspended</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {institute.slug} · Created {formatDateShort(institute.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <EnterInstituteButton
            id={institute.id}
            name={institute.name}
            status={institute.status}
            label="Enter institute"
          />
          <InstituteStatusToggle id={institute.id} status={institute.status} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Students" value={institute.students} tint="emerald" />
        <StatCard icon={ShieldCheck} label="Members" value={institute.members} tint="amber" />
        <StatCard
          icon={Ticket}
          label="Open tickets"
          value={institute.openTickets}
          tint="indigo"
        />
        <StatCard
          icon={Wallet}
          label="Revenue"
          value={formatCurrency(institute.revenue, { compact: true })}
          tint="blue"
        />
      </div>

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Members</h2>
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="No active members in this institute."
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.membershipId}>
                      <TableCell>
                        <MemberIdentity name={m.name} image={m.image} email={m.email} />
                      </TableCell>
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

            <div className="space-y-2.5 md:hidden">
              {members.map((m) => (
                <div key={m.membershipId} className="bg-card rounded-xl border p-3.5">
                  <MemberIdentity name={m.name} image={m.image} email={m.email} />
                  <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span>{m.roleName}</span>
                    <span className="tabular-nums">· {formatDateShort(m.joinedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Recent activity */}
      {activity.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Recent activity</h2>
          <PlatformActivity items={activity} showInstitute={false} />
        </section>
      )}
    </div>
  )
}

function MemberIdentity({
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
