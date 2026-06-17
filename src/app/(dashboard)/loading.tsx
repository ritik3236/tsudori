import { InfinityLoader } from "@/components/shared/infinity-loader"

// Instant fallback while a dashboard page's server render (auth + data) runs, so
// navigation never freezes on the previous page.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <InfinityLoader />
    </div>
  )
}
