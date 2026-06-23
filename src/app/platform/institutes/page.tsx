import type { Metadata } from "next"

import { formatCurrency } from "@/lib/format"
import { getSuperAdminContext } from "@/lib/tenant"
import { getPlatformStats } from "@/features/platform/service"
import { EnterInstituteButton } from "@/features/platform/components/enter-institute-button"
import { CreateInstituteDialog } from "@/features/platform/components/create-institute-dialog"
import { InstituteStatusToggle } from "@/features/platform/components/institute-status-toggle"

export const metadata: Metadata = { title: "Institutes" }

export default async function PlatformInstitutesPage() {
  const ctx = await getSuperAdminContext()
  const { rows } = await getPlatformStats(ctx)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutes</h1>
          <p className="text-muted-foreground text-sm">
            {rows.length} {rows.length === 1 ? "institute" : "institutes"} on the platform.
          </p>
        </div>
        <CreateInstituteDialog />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-4 py-2.5 font-medium">Institute</th>
              <th className="px-3 py-2.5 text-right font-medium">Students</th>
              <th className="px-3 py-2.5 text-right font-medium">Members</th>
              <th className="px-3 py-2.5 text-right font-medium">Open tickets</th>
              <th className="px-3 py-2.5 text-right font-medium">Revenue</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <EnterInstituteButton id={r.id} name={r.name} status={r.status} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.students}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.members}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.openTickets}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatCurrency(r.revenue)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <InstituteStatusToggle id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="divide-y md:hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <EnterInstituteButton id={r.id} name={r.name} status={r.status} />
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums">
                  <span>{r.students} students</span>
                  <span>{r.members} members</span>
                  <span>{r.openTickets} tickets</span>
                  <span>{formatCurrency(r.revenue)}</span>
                </div>
              </div>
              <InstituteStatusToggle id={r.id} status={r.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
