import "server-only"

import { can, type TenantContext } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import type { TicketViewer } from "@/features/tickets/service"

// Translates a resolved tenant context into the viewer shape the ticket service
// authorizes against. Shared by the API routes and the detail page so the access
// rules stay defined in exactly one place.
export function toTicketViewer(ctx: TenantContext): TicketViewer {
  return {
    viewerId: ctx.user.id,
    instituteId: ctx.institute.id,
    isInstituteAdmin: can(ctx, PERMISSIONS.INSTITUTE_MANAGE),
    isSuperAdmin: ctx.isSuperAdmin,
  }
}
