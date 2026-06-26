"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { aiApi } from "./api"
import { aiKeys } from "./keys"
import type { InsightResult } from "./types"

export { aiKeys }

/** Loads the institute's AI insights (server-cached per day). */
export function useInsights() {
  return useQuery({
    queryKey: aiKeys.insights(),
    queryFn: () => aiApi.insights(),
    // Insights are cached server-side per day — don't refetch on focus/mount.
    staleTime: 60 * 60_000,
    retry: false,
  })
}

/** Forces a fresh generation (bypasses the daily cache) and updates the view. */
export function useRegenerateInsights() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => aiApi.insights(true),
    onSuccess: (data) => {
      qc.setQueryData<InsightResult>(aiKeys.insights(), data)
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Couldn't regenerate insights.")
    },
  })
}
