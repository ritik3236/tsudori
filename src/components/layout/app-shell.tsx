"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@neondatabase/auth-ui"
import { GraduationCap } from "lucide-react"

import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/constants"
import { visibleNavItems, type NavItem } from "@/components/layout/nav"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Badge } from "@/components/ui/badge"

type AppShellProps = {
  instituteName: string
  permissions: string[]
  children: React.ReactNode
}

export function AppShell({ instituteName, permissions, children }: AppShellProps) {
  const items = visibleNavItems(new Set(permissions))

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — unchanged; hidden on mobile in favour of the bottom bar */}
      <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r lg:flex">
        <BrandHeader instituteName={instituteName} />
        <SidebarNav items={items} className="flex-1 px-3 py-4" />
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar. pt-safe pushes the row below the status bar/notch; the inner
            row keeps a fixed 56px height for a stable, tappable header. */}
        <header className="bg-background/80 sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <Link
              href="/dashboard"
              aria-label={APP_NAME}
              className="flex items-center gap-2 lg:hidden"
            >
              <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <GraduationCap className="size-4.5" />
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{instituteName}</p>
            </div>

            <UserButton size="icon" />
          </div>
        </header>

        {/* Bottom padding clears the fixed bottom nav (mobile) + home indicator */}
        <main className="flex-1 px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile-only thumb-zone navigation */}
      <BottomNav items={items} />
    </div>
  )
}

function BrandHeader({ instituteName }: { instituteName: string }) {
  return (
    <div className="flex h-14 items-center gap-2.5 border-b px-5">
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <GraduationCap className="size-4.5" />
      </span>
      <div className="flex min-w-0 flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
        <span className="text-muted-foreground truncate text-xs">{instituteName}</span>
      </div>
    </div>
  )
}

function SidebarNav({
  items,
  className,
  onNavigate,
}: {
  items: NavItem[]
  className?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
            {item.comingSoon && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Soon
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  return (
    <div className="text-muted-foreground border-t px-5 py-3 text-xs">
      {APP_NAME} · v0.1
    </div>
  )
}
