import type { Metadata } from "next"
import { Building2, ShieldCheck, Ticket, Users, Wallet } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { getSuperAdminContext } from "@/lib/tenant"
import { getPlatformActivity, getPlatformStats } from "@/features/platform/service"
import { StatCard } from "@/features/platform/components/stat-card"
import { PlatformActivity } from "@/features/platform/components/platform-activity"
import { InstituteNameLink } from "@/features/platform/components/institute-name-link"

export const metadata: Metadata = { title: "Platform" }

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
                    <InstituteNameLink id={r.id} name={r.name} status={r.status} />
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
                <InstituteNameLink id={r.id} name={r.name} status={r.status} />
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
          <PlatformActivity items={activity} />
        </section>
      )}
    </div>
  )
}
