import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

// Rendered (with a 403 status) whenever a page calls forbidden() — i.e. the
// visitor is signed in and inside an institute, but lacks the permission this
// page requires. See requirePagePermission in src/lib/tenant.ts.
export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="bg-card w-full max-w-md space-y-4 rounded-2xl border p-8 text-center">
        <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
          <Lock className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">You don&apos;t have access</h1>
          <p className="text-muted-foreground text-sm">
            This page is restricted by your role. If you need access, ask an
            institute admin to update your permissions.
          </p>
        </div>
        <Button render={<Link href="/dashboard" />} className="w-full">
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
