import "server-only"

import { createNeonAuth } from "@neondatabase/auth/next/server"

// The unified server-side Neon Auth instance. Provides:
//   • auth.handler()    — API route proxy (src/app/api/auth/[...path]/route.ts)
//   • auth.middleware()  — route protection (src/proxy.ts)
//   • auth.getSession()  — session in Server Components / Actions / Route Handlers
// plus all Better Auth server methods (signIn, signUp, signOut, …).
//
// NEON_AUTH_BASE_URL comes from the Neon Console (Branch → Auth → Configuration).
// NEON_AUTH_COOKIE_SECRET signs the session-data cookie (32+ chars).
//
// sessionDataTtl: how long the signed `session_data` cookie caches the session
// before the middleware/getSession must re-validate against the upstream auth
// backend. Default is 300s (5 min) — so after ~5 min idle the next request makes
// a live upstream call, and if the Neon compute has autosuspended that cold-start
// can time out and bounce a still-valid user to /auth/sign-in. Set to 1 day so
// the fast cookie path covers virtually all idle. Trade-off: a revoked session
// (sign-out elsewhere / ban) can linger up to a day; acceptable for this app.
// Complementary fix: a longer compute autosuspend window so the upstream never
// cold-starts.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 60 * 60 * 24,
  },
})
