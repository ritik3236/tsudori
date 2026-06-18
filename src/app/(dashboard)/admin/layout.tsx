import { getTenantContext, requireAdminPage } from "@/lib/tenant"

// The whole /admin area is role-gated: only the platform super admin and the
// institute's Institute Admin role get in (not just anyone with a stray
// admin-ish permission). Non-admins hit the friendly forbidden.tsx (403).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getTenantContext()
  requireAdminPage(ctx)
  return <>{children}</>
}
