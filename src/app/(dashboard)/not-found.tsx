import Link from "next/link"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

// Friendly 404 for unmatched dashboard routes (and any notFound() call within
// the dashboard), shown inside the app shell instead of Next's bare default.
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="bg-card w-full max-w-md space-y-4 rounded-2xl border p-8 text-center">
        <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
          <Compass className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Page not found</h1>
          <p className="text-muted-foreground text-sm">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
        </div>
        <Button render={<Link href="/dashboard" />} className="w-full">
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
