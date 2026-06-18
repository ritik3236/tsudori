import { BackLink } from "@/components/shared/back-link"
import { Skeleton } from "@/components/ui/skeleton"

// Suspense fallback shown while the class detail (class + enrolled students)
// loads. Mirrors ClassDetail's header + students table.
export default function ClassDetailLoading() {
  return (
    <div className="space-y-6">
      <BackLink href="/classes" label="Classes" />

      <div className="space-y-6">
        {/* Header: class name + meta + edit */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>

        {/* Enrolled students */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="overflow-hidden rounded-xl border">
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5">
                  <Skeleton className="size-4 shrink-0" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
