import Link from "next/link"
import { redirect } from "next/navigation"
import { GraduationCap } from "lucide-react"

import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
import { getCurrentUser } from "@/lib/auth"
import { LoginRedirectOverlay } from "@/components/auth/login-redirect-overlay"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Already signed in? The auth views (sign-in, etc.) aren't covered by the
  // proxy guard, so send authenticated users to the dashboard instead of
  // letting them sit on the sign-in screen.
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <GraduationCap className="size-5" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          <span className="text-muted-foreground text-xs">{APP_TAGLINE}</span>
        </span>
      </Link>
      {children}
      {/* Covers the login → dashboard redirect with the loader (login only). */}
      <LoginRedirectOverlay />
    </div>
  )
}
