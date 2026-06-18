import type { Metadata } from "next"
import { AuthView } from "@neondatabase/auth-ui"
import { authViewPaths } from "@neondatabase/auth-ui/server"

export const metadata: Metadata = { title: "Account" }

// Catch-all for the Neon Auth UI views (sign-in, sign-up, forgot-password, …).
// Lives in the (auth) route group so it inherits the branded auth layout. Base
// path is /auth (the provider default), so URLs are /auth/sign-in, /auth/sign-up.
export const dynamicParams = false

export function generateStaticParams() {
  // Public self-signup is disabled — drop the sign-up view so /auth/sign-up 404s
  // (dynamicParams is false). People join only via an invite link.
  return Object.entries(authViewPaths)
    .filter(([key]) => key !== "signUp")
    .map(([, path]) => ({ path }))
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>
}) {
  const { path } = await params
  return <AuthView path={path} />
}
