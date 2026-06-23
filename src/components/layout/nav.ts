import {
  BarChart3,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  School,
  Settings,
  ShieldCheck,
  StickyNote,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { PERMISSIONS, type Permission } from "@/lib/rbac"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Tailwind text-color class(es) applied to the icon/label when this item is
   *  the active route — each destination gets its own accent. Must be full
   *  literal class strings so Tailwind keeps them. */
  activeColor: string
  /** When set, the item only shows for users holding this permission. */
  permission?: Permission
  /** When true, the item is role-gated to institute/super admins (not permission). */
  adminOnly?: boolean
  /** Marks modules planned but not yet built in V1. */
  comingSoon?: boolean
}

// The full V1 navigation tree. Student Management is live; the rest are scaffolded
// placeholders that mirror the spec so the IA is complete from day one.
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    activeColor: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    activeColor: "text-violet-600 dark:text-violet-400",
    permission: PERMISSIONS.STUDENT_READ,
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    activeColor: "text-emerald-600 dark:text-emerald-400",
    permission: PERMISSIONS.ATTENDANCE_READ,
    comingSoon: true,
  },
  {
    label: "Fees",
    href: "/fees",
    icon: Wallet,
    activeColor: "text-amber-600 dark:text-amber-400",
    permission: PERMISSIONS.FEE_READ,
  },
  {
    label: "Classes",
    href: "/classes",
    icon: School,
    activeColor: "text-orange-600 dark:text-orange-400",
    permission: PERMISSIONS.CLASS_READ,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    activeColor: "text-sky-600 dark:text-sky-400",
    permission: PERMISSIONS.REPORT_VIEW,
    comingSoon: true,
  },
  {
    // Shared institute-wide note board. Open to every member (no permission gate).
    label: "Notes",
    href: "/notes",
    icon: StickyNote,
    activeColor: "text-teal-600 dark:text-teal-400",
  },
  {
    // Support tickets. Open to every member (no permission gate): members file +
    // track their own; the platform super admin sees the cross-institute queue.
    label: "Tickets",
    href: "/tickets",
    icon: Ticket,
    activeColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    // Personal settings (your profile + password) — open to every member.
    label: "Settings",
    href: "/settings",
    icon: Settings,
    activeColor: "text-rose-600 dark:text-rose-400",
  },
  {
    // Institute admin area — role-gated (Institute Admin + super admin).
    label: "Admin",
    href: "/admin/settings",
    icon: ShieldCheck,
    activeColor: "text-rose-600 dark:text-rose-400",
    adminOnly: true,
  },
]

// Super-admin platform area (cross-tenant). Every item is super-admin-only by the
// route gate, so there's no permission filtering — rendered as-is.
export const PLATFORM_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/platform",
    icon: LayoutDashboard,
    activeColor: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "Institutes",
    href: "/platform/institutes",
    icon: Building2,
    activeColor: "text-violet-600 dark:text-violet-400",
  },
  {
    label: "Students",
    href: "/platform/students",
    icon: Users,
    activeColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Tickets",
    href: "/platform/tickets",
    icon: Ticket,
    activeColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    label: "Members",
    href: "/platform/members",
    icon: ShieldCheck,
    activeColor: "text-amber-600 dark:text-amber-400",
  },
]

export function visibleNavItems(
  permissions: ReadonlySet<string>,
  isAdmin: boolean
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin
    return !item.permission || permissions.has(item.permission)
  })
}
