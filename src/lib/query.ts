import { QueryClient } from "@tanstack/react-query"

// A fresh QueryClient per server request, used to prefetch data in a server
// component and hand it to the client via <HydrationBoundary state={dehydrate(qc)}>.
// NEVER share one across requests — that would leak one tenant's data into
// another tenant's render. The client-side singleton lives in query-provider.tsx.
export function makeServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Match the browser client so hydrated data is considered fresh on mount
        // and the hook doesn't immediately refetch what we just server-rendered.
        staleTime: 30_000,
      },
    },
  })
}
