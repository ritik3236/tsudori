import { auth } from "@/lib/auth/server"

// Next.js 16 renames `middleware.ts` → `proxy.ts`. Neon Auth's middleware
// validates the session cookie, refreshes it when needed, and redirects
// unauthenticated requests to the sign-in view. Authorization (RBAC, tenancy)
// still happens deeper, in getTenantContext.
//
// The matcher lists only the authenticated areas, so the marketing landing (`/`),
// the auth views (`/auth/*`), and the auth API proxy (`/api/auth/*`) stay public.
export default auth.middleware({
  loginUrl: "/auth/sign-in",
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/attendance/:path*",
    "/fees/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/api/students/:path*",
    "/api/classes/:path*",
  ],
}
