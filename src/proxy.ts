import { NextResponse, type NextRequest } from "next/server"

import { auth } from "@/lib/auth/server"

// Next.js 16 renames `middleware.ts` → `proxy.ts`. Neon Auth's middleware
// validates/refreshes the session cookie and redirects unauthenticated requests
// to the sign-in view. Authorization (RBAC, tenancy) still happens deeper, in
// getTenantContext.
//
// IMPORTANT: only PAGE routes belong here. A `/api/*` request the middleware
// deems unauthenticated gets a 307 → /auth/sign-in; a fetch() then follows that
// redirect and receives the HTML login page instead of JSON, surfacing as a
// spurious "logged out" error. API routes guard themselves (getTenantContext /
// requirePermission → 401/403 JSON), so they must NOT be matched here.
//
// We also let SERVER ACTION POSTs through. They already authorize via
// getTenantContext/requireUser — and that reads the CACHED session, so it works
// even when the Neon auth compute has autosuspended. The proxy, by contrast,
// does a live upstream get-session for those POSTs and bounces them to
// /auth/sign-in (a 307) on cold start, surfacing to users as "Couldn't save".
// Letting action POSTs through (each self-guards — audited) fixes that.
//
// We gate that skip on the `Next-Action` header so it applies ONLY to server
// actions. An ordinary unauthenticated POST to a page route still goes through
// the proxy and gets the standard 307 → sign-in, instead of falling through to
// the RSC render and surfacing as a generic 500. Page GET navigations + OAuth
// callbacks still go through the proxy as before.
const authMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" })

export default function proxy(request: NextRequest) {
  if (request.method === "POST" && request.headers.has("next-action")) {
    return NextResponse.next()
  }
  return authMiddleware(request)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/classes/:path*",
    "/attendance/:path*",
    "/fees/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/notes/:path*",
    "/tickets/:path*",
    "/choose-institute/:path*",
  ],
}
