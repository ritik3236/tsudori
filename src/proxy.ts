import { auth } from "@/lib/auth/server"

// Next.js 16 renames `middleware.ts` → `proxy.ts`. Neon Auth's middleware
// validates the session cookie, refreshes it when needed, and redirects
// unauthenticated requests to the sign-in view. Authorization (RBAC, tenancy)
// still happens deeper, in getTenantContext.
//
// IMPORTANT: only PAGE routes belong here. A `/api/*` request that the middleware
// deems unauthenticated gets a 307 → /auth/sign-in; a fetch() then follows that
// redirect and receives the HTML login page instead of JSON, which the client
// surfaces as a spurious "logged out" error (this broke add-student / edit-class
// mutations while /api/notes — never matched — worked). API routes guard
// themselves: every handler calls getTenantContext()/requirePermission(), which
// return 401/403 JSON. So API routes must NOT be matched here.
export default auth.middleware({
  loginUrl: "/auth/sign-in",
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/classes/:path*",
    "/attendance/:path*",
    "/fees/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
}
