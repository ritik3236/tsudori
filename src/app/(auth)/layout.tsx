import Link from "next/link"
import { GraduationCap } from "lucide-react"

import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
import { LoginRedirectOverlay } from "@/components/auth/login-redirect-overlay"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
