import type { InstituteStatus } from "@prisma/client"

export type InstituteProfile = {
  id: string
  name: string
  logoUrl: string | null
  email: string | null
  phone: string | null
  addressLine: string | null
}

/** A switchable institute, for the header switcher + post-login picker.
 *  `roleName` is the viewer's role in it (null for a super admin who isn't a member). */
export type InstituteOption = {
  id: string
  name: string
  logoUrl: string | null
  roleName: string | null
  status: InstituteStatus
}
