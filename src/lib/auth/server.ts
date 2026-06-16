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
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
})
