// Display strings for the audit view. Client-safe (no server-only imports) and
// keyed by the dotted action / entityType strings written by the service.

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "fee.payment.reverse": "Reversed a payment",
  "fee.waiver.reverse": "Reversed a waiver",
  "fee.waive": "Waived a fee",
  "member.remove": "Removed a member",
  "member.restore": "Restored a member",
  "member.role_change": "Changed a member's role",
  "student.archive": "Archived a student",
  "role.permissions_change": "Changed role permissions",
}

export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  FeePayment: "Payment",
  FeeWaiver: "Waiver",
  Student: "Student",
  Membership: "Member",
  Role: "Role",
}

/**
 * Where a row points when clicked — the entity it touched. Fee actions resolve
 * to the student's fee page (the payment/waiver id isn't directly routable);
 * member/role actions land on their admin list. Returns null when there's no
 * sensible destination.
 */
export function auditEntityHref(
  action: string,
  entityId: string,
  metadata: Record<string, unknown> | null
): string | null {
  const studentId =
    typeof metadata?.studentId === "string" ? metadata.studentId : null
  if (action.startsWith("student.")) return `/students/${entityId}`
  if (action.startsWith("fee.")) return `/fees/${studentId ?? entityId}`
  if (action.startsWith("member.")) return "/admin/settings/team"
  if (action.startsWith("role.")) return "/admin/settings/roles"
  return null
}

/** Options for the entity-type filter dropdown. */
export const AUDIT_ENTITY_FILTERS = [
  { value: "FeePayment", label: "Payments" },
  { value: "FeeWaiver", label: "Waivers" },
  { value: "Student", label: "Students" },
  { value: "Membership", label: "Members" },
  { value: "Role", label: "Roles" },
] as const
