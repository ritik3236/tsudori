import { BackLink } from "@/components/shared/back-link"
import { Skeleton } from "@/components/ui/skeleton"

// Suspense fallback shown while the student's fee detail loads. Mirrors the
// header + stat grid + payment history layout.
export default function StudentFeesLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/fees" label="Fees" />

      {/* Header: name + meta + actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Payment history */}
      <div>
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
