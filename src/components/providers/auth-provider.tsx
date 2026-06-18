"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { NeonAuthUIProvider } from "@neondatabase/auth-ui"

import { authClient } from "@/lib/auth/client"

// Wires the Neon Auth UI components (AuthView, UserButton, SignedIn/Out) to our
// auth client and to Next's router for navigation. Wraps the whole app so the
// session context is available in both the auth views and the dashboard shell.
export function AuthUIProvider({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const router = useRouter()

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={Link}
      redirectTo="/dashboard"
      defaultTheme="light"
      // Public self-signup is disabled — people join only via an invite link
      // (/invite/<token>). The auth UI shows sign-in only.
      signUp={false}
      className={className}
    >
      {children}
    </NeonAuthUIProvider>
  )
}
