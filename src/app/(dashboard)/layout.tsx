import { ShieldAlert } from "lucide-react"

import { getTenantContext } from "@/lib/tenant"
import { ForbiddenError } from "@/lib/errors"
import { AppShell } from "@/components/layout/app-shell"
import { SignOutButton } from "@/components/auth/sign-out-button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let ctx: Awaited<ReturnType<typeof getTenantContext>>
  try {
    ctx = await getTenantContext()
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <NoAccessScreen message={error.message} />
    }
    throw error
  }

  return (
    <AppShell
      instituteName={ctx.institute.name}
      logoUrl={ctx.institute.logoUrl}
      permissions={[...ctx.permissions]}
    >
      {children}
    </AppShell>
  )
}

function NoAccessScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="bg-card w-full max-w-md space-y-4 rounded-xl border p-8 text-center">
        <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="text-lg font-semibold">No institute access</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <SignOutButton variant="outline" className="w-full">
          Sign out
        </SignOutButton>
      </div>
    </div>
  )
}
