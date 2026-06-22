import {
  Activity,
  Bell,
  CalendarDays,
  CircleUser,
  IndianRupee,
  Palette,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  University,
  Users,
  type LucideIcon,
} from "lucide-react"

import { PERMISSIONS, type Permission } from "@/lib/rbac"

export type SettingsSection = {
  label: string
  description: string
  href: string
  icon: LucideIcon
  /** When set, only listed for users holding this permission. Omit = everyone. */
  permission?: Permission
  /** Planned but not built yet — listed disabled with a "Soon" badge. */
  comingSoon?: boolean
}

// ─── Personal settings (/settings) ────────────────────────────────────────────
// Visible to EVERY signed-in user — no permission gate.
export const PERSONAL_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    label: "Your profile",
    description: "Your name and password.",
    href: "/settings/profile",
    icon: CircleUser,
  },
  {
    label: "Security",
    description: "Active sessions and password.",
    href: "/settings/security",
    icon: ShieldCheck,
  },
  {
    label: "Your activity",
    description: "Your recent actions and account sign-ins.",
    href: "/settings/activity",
    icon: Activity,
  },
  {
    label: "Appearance",
    description: "Theme and font for this device.",
    href: "/settings/appearance",
    icon: Palette,
  },
]

// ─── Admin settings (/admin/settings) ─────────────────────────────────────────
// The /admin area is role-gated (Institute Admin + super admin), so these mostly
// don't need per-row filtering — but `permission` is kept for clarity and the
// super-admin reach. Live areas first.
export const ADMIN_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    label: "Team members",
    description: "People with access, their roles, and password resets.",
    href: "/admin/settings/team",
    icon: Users,
    permission: PERMISSIONS.MEMBER_READ,
  },
  {
    label: "Roles & permissions",
    description: "Control what each role can do across the institute.",
    href: "/admin/settings/roles",
    icon: ShieldCheck,
    permission: PERMISSIONS.ROLE_MANAGE,
  },
  {
    label: "Audit log",
    description: "Who reversed a payment, changed a role, archived a student…",
    href: "/admin/audit",
    icon: ScrollText,
    permission: PERMISSIONS.AUDIT_READ,
  },
  {
    label: "Institute profile",
    description: "Logo, name, and contact details.",
    href: "/admin/settings/institute",
    icon: University,
    permission: PERMISSIONS.INSTITUTE_READ,
  },
  {
    label: "Appearance",
    description: "Default theme and font new members inherit.",
    href: "/admin/settings/appearance",
    icon: Palette,
    permission: PERMISSIONS.INSTITUTE_MANAGE,
  },
  {
    label: "Attendance",
    description: "Weekly off and holidays — which days attendance is taken.",
    href: "/admin/settings/attendance",
    icon: CalendarDays,
    permission: PERMISSIONS.ATTENDANCE_CONFIGURE,
  },
  {
    label: "Fees configuration",
    description: "Default fees, payment methods, and receipt numbering.",
    href: "/admin/settings/fees",
    icon: IndianRupee,
    permission: PERMISSIONS.FEE_CONFIGURE,
    comingSoon: true,
  },
  {
    label: "Notifications",
    description: "Reminders and alerts sent to staff and guardians.",
    href: "/admin/settings/notifications",
    icon: Bell,
    permission: PERMISSIONS.INSTITUTE_MANAGE,
    comingSoon: true,
  },
  {
    label: "Advanced",
    description: "Custom key/value settings and data tools.",
    href: "/admin/settings/advanced",
    icon: SlidersHorizontal,
    permission: PERMISSIONS.INSTITUTE_MANAGE,
    comingSoon: true,
  },
]

export function visibleSettingsSections(
  sections: SettingsSection[],
  permissions: ReadonlySet<string>
): SettingsSection[] {
  return sections.filter((s) => !s.permission || permissions.has(s.permission))
}
