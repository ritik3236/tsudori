import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

// Rendered (403) when a non-super-admin reaches a /platform page — the layout's
// requireSuperAdminPage(ctx) calls forbidden(). The (dashboard) forbidden.tsx is
// scoped to that route group, so /platform needs its own.
export default function PlatformForbidden() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="bg-card w-full max-w-md space-y-4 rounded-2xl border p-8 text-center">
        <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
          <Lock className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Platform access only</h1>
          <p className="text-muted-foreground text-sm">
            This area is restricted to platform super admins.
          </p>
        </div>
        <Button render={<Link href="/dashboard" />} className="w-full">
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
