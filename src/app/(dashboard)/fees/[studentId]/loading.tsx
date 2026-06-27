import { BackLink } from "@/components/shared/back-link"
import { Skeleton } from "@/components/ui/skeleton"

// Suspense fallback while the student's fee detail (a server component) loads.
// Mirrors the resolved shell so there's no layout shift: header → 2-up KPI grid +
// full-width Total paid → installments button + course enrolments → fee activity.
export default function StudentFeesLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/fees" label="Fees" />

      {/* Name + status pill, with the Waive action inline on the title row */}
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-lg sm:h-7" />
        </div>
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* KPI — two compact cards in a row, Total paid full-width below */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="bg-card flex items-baseline justify-between gap-3 rounded-2xl border p-4">
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-1 h-7 w-24" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Installments — the "Set up installments" button for a monthly student */}
      <Skeleton className="h-9 w-44 rounded-lg sm:h-7" />

      {/* Course enrolments — heading + Add-course action, then one enrolment row */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-lg sm:size-8" />
          </div>
        </div>
      </div>

      {/* Fee activity — rows lead with a round status icon */}
      <div>
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="size-8 shrink-0 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
