import type { Metadata } from "next"
import Link from "next/link"
import {
  BarChart3,
  CalendarCheck,
  GraduationCap,
  Plus,
  Receipt,
  Settings,
  TrendingDown,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { can, getTenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { getDashboardStats } from "@/features/dashboard/service"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDateShort, getInitials } from "@/lib/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmptyState } from "@/components/shared/empty-state"

export const metadata: Metadata = { title: "Dashboard" }

type Tint = "violet" | "emerald" | "amber" | "sky" | "rose"

// Soft-pastel accent tints. Full literal class strings (Tailwind can't see
// interpolated names) with dark-mode variants so the palette holds in both themes.
const TINT: Record<Tint, string> = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
}

export default async function DashboardPage() {
  const ctx = await getTenantContext()
  const stats = await getDashboardStats(ctx.institute.id)
  const att = stats.attendance

  const tiles = (
    [
      { label: "Students", href: "/students", icon: Users, perm: PERMISSIONS.STUDENT_READ, tint: "violet" },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck, perm: PERMISSIONS.ATTENDANCE_READ, tint: "emerald" },
      { label: "Fees", href: "/fees", icon: Wallet, perm: PERMISSIONS.FEE_READ, tint: "amber" },
      { label: "Reports", href: "/reports", icon: BarChart3, perm: PERMISSIONS.REPORT_VIEW, tint: "sky" },
      { label: "Settings", href: "/settings", icon: Settings, perm: PERMISSIONS.SETTING_READ, tint: "rose" },
      { label: "Add student", href: "/students/new", icon: Plus, perm: PERMISSIONS.STUDENT_CREATE, tint: "violet" },
    ] as const
  ).filter((t) => can(ctx, t.perm))

  return (
    <div className="space-y-7">
      {/* Greeting hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-violet-100 via-violet-50 to-pink-100 p-5 dark:from-violet-500/15 dark:via-background dark:to-pink-500/10">
        <p className="text-muted-foreground text-sm">Welcome back</p>
        <h1 className="text-xl font-semibold tracking-tight">{ctx.institute.name}</h1>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Here&apos;s what&apos;s happening at your institute today.
        </p>
        <GraduationCap className="pointer-events-none absolute -right-3 -bottom-4 size-28 text-violet-500/20 dark:text-violet-300/15" />
      </div>

      {/* Quick access launcher grid */}
      <Section title="Quick access">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="bg-card flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-colors hover:bg-muted/40"
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl",
                  TINT[t.tint]
                )}
              >
                <t.icon className="size-5" />
              </span>
              <span className="text-xs font-medium">{t.label}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Overview */}
      <Section title="Overview">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard tint="violet" icon={Users} label="Total students" value={stats.totalStudents} />
          <StatCard tint="emerald" icon={CalendarCheck} label="Present today" value={att.present} />
          <StatCard tint="amber" icon={TrendingDown} label="Outstanding" value={formatCurrency(stats.outstandingThisMonth)} />
          <StatCard tint="sky" icon={Wallet} label="Collected" value={formatCurrency(stats.feeCollectedThisMonth)} />
        </div>
      </Section>

      {/* Attendance + recent payments */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card space-y-4 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Today&apos;s attendance</h2>
            <Link
              href="/attendance"
              className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
            >
              Mark
            </Link>
          </div>
          <AttendanceBar att={att} />
          <div className="space-y-2.5">
            <AttendanceRow label="Present" value={att.present} dot="bg-emerald-500" />
            <AttendanceRow label="Absent" value={att.absent} dot="bg-rose-500" />
            <AttendanceRow label="On leave" value={att.leave} dot="bg-amber-500" />
            <AttendanceRow label="Not marked" value={att.notMarked} dot="bg-muted-foreground/40" />
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Recent payments</h2>
            <Receipt className="text-muted-foreground size-4" />
          </div>
          {stats.recentPayments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="Fee payments will appear here once you start collecting."
              className="border-0 py-8"
            />
          ) : (
            <ul className="divide-y">
              {stats.recentPayments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                      {getInitials(p.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.studentName}</p>
                    <p className="text-muted-foreground text-xs">
                      Receipt #{p.receiptNo} · {formatDateShort(p.paidAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
      {children}
    </section>
  )
}

function StatCard({
  tint,
  icon: Icon,
  label,
  value,
}: {
  tint: Tint
  icon: LucideIcon
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <span
        className={cn(
          "mb-3 flex size-9 items-center justify-center rounded-lg",
          TINT[tint]
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}

function AttendanceRow({
  label,
  value,
  dot,
}: {
  label: string
  value: number
  dot: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-2">
        <span className={cn("size-2 rounded-full", dot)} />
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function AttendanceBar({
  att,
}: {
  att: { present: number; absent: number; leave: number; notMarked: number }
}) {
  const total = Math.max(att.present + att.absent + att.leave + att.notMarked, 1)
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`
  return (
    <div className="bg-muted flex h-2.5 overflow-hidden rounded-full">
      <span className="bg-emerald-500" style={{ width: pct(att.present) }} />
      <span className="bg-rose-500" style={{ width: pct(att.absent) }} />
      <span className="bg-amber-500" style={{ width: pct(att.leave) }} />
    </div>
  )
}
