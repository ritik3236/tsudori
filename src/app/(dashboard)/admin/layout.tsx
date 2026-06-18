import { getTenantContext, requireAdminPage } from "@/lib/tenant"

// The whole /admin area is permission-gated: the platform super admin, or anyone
// holding ANY admin permission, gets in (each page then enforces its specific
// permission). Everyone else hits the friendly forbidden.tsx (403).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getTenantContext()
  requireAdminPage(ctx)
  return <>{children}</>
}
