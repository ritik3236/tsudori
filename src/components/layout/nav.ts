import {
  BarChart3,
  CalendarCheck,
  LayoutDashboard,
  School,
  Settings,
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
    label: "Classes",
    href: "/classes",
    icon: School,
    activeColor: "text-orange-600 dark:text-orange-400",
    permission: PERMISSIONS.CLASS_READ,
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
    comingSoon: true,
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
    label: "Settings",
    href: "/settings",
    icon: Settings,
    activeColor: "text-rose-600 dark:text-rose-400",
    permission: PERMISSIONS.SETTING_READ,
  },
]

export function visibleNavItems(permissions: ReadonlySet<string>): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.permission || permissions.has(item.permission)
  )
}
