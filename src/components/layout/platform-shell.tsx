"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@neondatabase/auth-ui"
import { ArrowLeft, Globe } from "lucide-react"

import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/constants"
import { PLATFORM_NAV_ITEMS, type NavItem } from "@/components/layout/nav"
import { RefreshButton } from "@/components/layout/refresh-button"
import { ThemeSelector } from "@/components/layout/theme-selector"
import { Badge } from "@/components/ui/badge"

type PlatformShellProps = {
  /** The super admin's active institute — the "Back to …" escape hatch. */
  activeInstituteName: string
  children: React.ReactNode
}

/**
 * Chrome for the cross-tenant super-admin area. Mirrors AppShell's structure
 * (desktop sidebar + sticky top bar) but with platform nav, a "Platform" brand,
 * and no institute switcher — plus a "Back to {institute}" link, since the active
 * institute is still cookie-pinned and /dashboard re-enters it instantly.
 */
export function PlatformShell({
  activeInstituteName,
  children,
}: PlatformShellProps) {
  const pathname = usePathname()
  const current = PLATFORM_NAV_ITEMS.find(
    (i) =>
      pathname === i.href ||
      (i.href !== "/platform" && pathname.startsWith(`${i.href}/`))
  )
  const pageTitle = current?.label ?? "Platform"

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b px-5">
          <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Globe className="size-4.5" />
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
            <span className="text-muted-foreground truncate text-xs">Platform</span>
          </div>
        </div>

        <PlatformNav className="flex-1 px-3 py-4" />

        <div className="border-t p-3">
          <Link
            href="/dashboard"
            prefetch={true}
            className="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="truncate">Back to {activeInstituteName}</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            {/* Mobile: escape back to the active institute */}
            <Link
              href="/dashboard"
              prefetch={true}
              aria-label={`Back to ${activeInstituteName}`}
              className="text-muted-foreground hover:text-foreground -ml-1 flex items-center lg:hidden"
            >
              <ArrowLeft className="size-5 shrink-0" />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold tracking-tight">
                {pageTitle}
              </p>
              <p className="text-muted-foreground truncate text-xs leading-tight lg:hidden">
                Platform
              </p>
            </div>

            <ThemeSelector />
            <RefreshButton />
            <UserButton size="icon" />
          </div>
        </header>

        <main className="flex-1 bg-background px-4 py-6 pb-[max(env(safe-area-inset-bottom),2rem)] lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function PlatformNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {PLATFORM_NAV_ITEMS.map((item: NavItem) => {
        const Icon = item.icon

        // Phase 3 placeholders — visible but not yet routable.
        if (item.comingSoon) {
          return (
            <span
              key={item.href}
              className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <Icon className="size-4.5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                Soon
              </Badge>
            </span>
          )
        }

        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className={cn("size-4.5 shrink-0", active && item.activeColor)} />
            <span className="flex-1 truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
