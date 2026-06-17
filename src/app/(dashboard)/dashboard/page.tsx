import type { Metadata } from "next"
import Link from "next/link"
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Receipt,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"

import { can, getTenantContext } from "@/lib/tenant"
import { APP_TIMEZONE } from "@/lib/date-helper"
import { PERMISSIONS } from "@/lib/rbac"
import { getDashboardStats } from "@/features/dashboard/service"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDateShort, getInitials } from "@/lib/format"
import { EmptyState } from "@/components/shared/empty-state"

export const metadata: Metadata = { title: "Dashboard" }

type Scheme = "violet" | "emerald" | "amber" | "sky" | "rose"

const CHIP: Record<Scheme, string> = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
}

const AVATAR = [
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
]

/** ₹10.8k / ₹1.2L / ₹3Cr — short money for the compact stat strip. */
function compactInr(n: number): string {
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, "")
  if (n >= 1_00_00_000) return `₹${trim(n / 1_00_00_000)}Cr`
  if (n >= 1_00_000) return `₹${trim(n / 1_00_000)}L`
  if (n >= 1_000) return `₹${trim(n / 1_000)}k`
  return `₹${n}`
}

export default async function DashboardPage() {
  const ctx = await getTenantContext()
  const stats = await getDashboardStats(ctx.institute.id)
  const att = stats.attendance

  const now = new Date()
  const hour = parseInt(
    new Intl.DateTimeFormat("en-IN", { timeZone: APP_TIMEZONE, hour: "numeric", hour12: false }).format(now)
  )
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const today = new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now)

  // Quick-access tiles. "Time table" isn't built yet, so it points at the closest
  // live module for now.
  const shortcuts = (
    [
      { label: "Students", href: "/students", icon: Users, perm: PERMISSIONS.STUDENT_READ, tint: "violet" },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck, perm: PERMISSIONS.ATTENDANCE_READ, tint: "emerald" },
      { label: "Fees", href: "/fees", icon: Wallet, perm: PERMISSIONS.FEE_READ, tint: "amber" },
      { label: "Reports", href: "/reports", icon: BarChart3, perm: PERMISSIONS.REPORT_VIEW, tint: "sky" },
      { label: "Time table", href: "/attendance", icon: CalendarDays, perm: PERMISSIONS.ATTENDANCE_READ, tint: "rose" },
      { label: "Add student", href: "/students/new", icon: UserPlus, perm: PERMISSIONS.STUDENT_CREATE, tint: "violet" },
    ] as const
  ).filter((s) => can(ctx, s.perm))

  return (
    <div className="mx-auto max-w-2xl space-y-6 lg:max-w-none">
      {/* Greeting joined with the headline stats (strip overlaps the banner) */}
      <div>
        <div className="relative overflow-hidden rounded-[16px] bg-violet-200/80 px-5 pt-5 pb-14 dark:bg-violet-500/15">
          <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase dark:text-violet-300">
            {greeting}
          </p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight">{today}</p>
          <GraduationCap
            strokeWidth={1.5}
            className="pointer-events-none absolute right-4 bottom-5 size-12 text-violet-500/30 dark:text-violet-300/25"
          />
        </div>
        <div className="card-soft relative -mt-9 mx-2 grid grid-cols-3 divide-x divide-border/70 rounded-[16px] bg-card py-4">
          <Stat value={stats.totalStudents} label="Students" />
          <Stat value={att.present} label="Present" />
          <Stat value={compactInr(stats.feeCollectedThisMonth)} label="Collected" />
        </div>
      </div>

      {/* Shortcuts */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">Shortcuts</h2>
        <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-4 lg:grid-cols-6">
          {shortcuts.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="card-soft flex flex-col items-center gap-2.5 rounded-[16px] bg-card p-4 text-center transition-colors hover:bg-muted/40"
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-[12px]",
                  CHIP[s.tint]
                )}
              >
                <s.icon className="size-6" />
              </span>
              <span className="text-xs font-medium">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Attendance */}
        <div className="card-soft bg-card rounded-[16px] p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Today&apos;s attendance</h2>
            <Link
              href="/attendance"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-violet-100 px-4 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-200"
            >
              <CalendarCheck className="size-3.5" />
              Mark
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <Ring value={att.present} total={stats.totalStudents} />
            <div className="flex-1 space-y-2.5">
              <Legend label="Present" value={att.present} dot="bg-emerald-500" />
              <Legend label="Absent" value={att.absent} dot="bg-rose-500" />
              <Legend label="On leave" value={att.leave} dot="bg-amber-500" />
              <Legend label="Not marked" value={att.notMarked} dot="bg-foreground/25" />
            </div>
          </div>
        </div>

        {/* Recent payments */}
        <div className="card-soft bg-card rounded-[16px] p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent payments</h2>
            <Link
              href="/fees"
              className="text-muted-foreground text-xs font-medium hover:text-foreground"
            >
              See all
            </Link>
          </div>
          {stats.recentPayments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="Fee payments will appear here once you start collecting."
              className="border-0 py-8"
            />
          ) : (
            <ul className="space-y-1">
              {stats.recentPayments.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      AVATAR[i % AVATAR.length]
                    )}
                  >
                    {getInitials(p.studentName)}
                  </span>
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

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="px-2 text-center">
      <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
    </div>
  )
}

function Legend({
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
        <span className={cn("size-2.5 rounded-full", dot)} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function Ring({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 80 80" className="size-28 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="9"
          className="stroke-black/8 dark:stroke-white/10"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className="stroke-emerald-500"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{pct}%</span>
        <span className="text-muted-foreground text-[11px]">present</span>
      </div>
    </div>
  )
}
