import {
  Bell,
  GraduationCap,
  IndianRupee,
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
  /** Only listed for users holding this permission. */
  permission: Permission
  /** Planned but not built yet — listed disabled with a "Soon" badge. */
  comingSoon?: boolean
}

// The Settings hub is a list of category rows, each linking to its own sub-route.
// Adding a settings area = add an entry here + build its page; the hub and its
// permission gating come for free. Keep `live` areas first so the most useful
// rows sit at the top.
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    label: "Team members",
    description: "People with access, their roles, and password resets.",
    href: "/settings/team",
    icon: Users,
    permission: PERMISSIONS.MEMBER_READ,
  },
  {
    label: "Institute profile",
    description: "Name, contact details, currency, and locale.",
    href: "/settings/profile",
    icon: University,
    permission: PERMISSIONS.SETTING_READ,
    comingSoon: true,
  },
  {
    label: "Classes & grades",
    description: "Configure the classes and grades students belong to.",
    href: "/settings/classes",
    icon: GraduationCap,
    permission: PERMISSIONS.CLASS_READ,
    comingSoon: true,
  },
  {
    label: "Fees configuration",
    description: "Default fees, payment methods, and receipt numbering.",
    href: "/settings/fees",
    icon: IndianRupee,
    permission: PERMISSIONS.FEE_READ,
    comingSoon: true,
  },
  {
    label: "Notifications",
    description: "Reminders and alerts sent to staff and guardians.",
    href: "/settings/notifications",
    icon: Bell,
    permission: PERMISSIONS.SETTING_MANAGE,
    comingSoon: true,
  },
  {
    label: "Advanced",
    description: "Custom key/value settings and data tools.",
    href: "/settings/advanced",
    icon: SlidersHorizontal,
    permission: PERMISSIONS.SETTING_MANAGE,
    comingSoon: true,
  },
]

export function visibleSettingsSections(
  permissions: ReadonlySet<string>
): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => permissions.has(s.permission))
}
