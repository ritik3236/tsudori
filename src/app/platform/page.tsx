import type { Metadata } from "next"
import {
  Building2,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCurrency, getInitials } from "@/lib/format"
import { formatRelative } from "@/lib/date-helper"
import { getSuperAdminContext } from "@/lib/tenant"
import { getPlatformActivity, getPlatformStats } from "@/features/platform/service"
import { AUDIT_ACTION_LABEL } from "@/features/audit/labels"
import { EnterInstituteButton } from "@/features/platform/components/enter-institute-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const metadata: Metadata = { title: "Platform" }

const TINT: Record<string, string> = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
}

export default async function PlatformPage() {
  const ctx = await getSuperAdminContext()
  const [stats, activity] = await Promise.all([
    getPlatformStats(ctx),
    getPlatformActivity(ctx, 8),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform</h1>
        <p className="text-muted-foreground text-sm">Cross-institute overview.</p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={Building2}
          label="Institutes"
          value={stats.institutes.total}
          sub={`${stats.institutes.active} active · ${stats.institutes.suspended} suspended`}
          tint="violet"
        />
        <StatCard icon={Users} label="Students" value={stats.students} tint="emerald" />
        <StatCard icon={ShieldCheck} label="Members" value={stats.members} tint="amber" />
        <StatCard icon={Ticket} label="Open tickets" value={stats.openTickets} tint="indigo" />
        <StatCard
          icon={Wallet}
          label="Revenue"
          value={formatCurrency(stats.revenue, { compact: true })}
          tint="blue"
        />
      </div>

      {/* Per-institute breakdown */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Institutes</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="px-4 py-2.5 font-medium">Institute</th>
                <th className="px-3 py-2.5 text-right font-medium">Students</th>
                <th className="px-3 py-2.5 text-right font-medium">Members</th>
                <th className="px-3 py-2.5 text-right font-medium">Open tickets</th>
                <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <EnterInstituteButton id={r.id} name={r.name} status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.students}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.members}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.openTickets}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatCurrency(r.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="divide-y md:hidden">
            {stats.rows.map((r) => (
              <div key={r.id} className="p-3.5">
                <EnterInstituteButton id={r.id} name={r.name} status={r.status} />
                <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
                  <span>{r.students} students</span>
                  <span>{r.members} members</span>
                  <span>{r.openTickets} open tickets</span>
                  <span>{formatCurrency(r.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent cross-tenant activity */}
      {activity.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Recent activity</h2>
          <div className="divide-y rounded-xl border bg-card">
            {activity.map((a) => (
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
                  {a.instituteName && (
                    <span className="text-muted-foreground"> · {a.instituteName}</span>
                  )}
                </p>
                <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                  {formatRelative(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  sub?: string
  tint: keyof typeof TINT
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <span className={cn("flex size-8 items-center justify-center rounded-lg", TINT[tint])}>
        <Icon className="size-4" />
      </span>
      <p className="mt-2 text-xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
      {sub && <p className="text-muted-foreground/80 mt-0.5 text-[11px]">{sub}</p>}
    </div>
  )
}
