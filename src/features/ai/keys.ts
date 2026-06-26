// Query-key factory. Its own pure module (api.ts is "use client") so server
// components could import it for prefetch without crossing the client boundary.
export const aiKeys = {
  all: ["ai"] as const,
  insights: () => [...aiKeys.all, "insights"] as const,
}
