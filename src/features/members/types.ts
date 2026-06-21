import type { MembershipStatus } from "@prisma/client"

// Wire DTO for a team member: a Membership joined with its Neon Auth user and
// role. Prisma Date is normalised to an ISO string so the shape is JSON-safe and
// identical on both sides of the API.
export type MemberListItem = {
  membershipId: string
  userId: string
  name: string
  image: string | null
  email: string
  emailVerified: boolean
  roleId: string
  roleName: string
  roleKey: string
  status: MembershipStatus
  /** Platform super admin (Neon Auth / Better Auth `role === "admin"`). */
  isSuperAdmin: boolean
  /** Platform-level ban (Neon Auth) — a banned user can't sign in. */
  banned: boolean
  banReason: string | null
  joinedAt: string
}

/** An institute role a new member can be assigned (e.g. Institute Admin, Teacher). */
export type RoleOption = {
  id: string
  key: string
  name: string
}
