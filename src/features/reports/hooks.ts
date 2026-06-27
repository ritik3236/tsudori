"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { reportsApi } from "./api"

/** Runs a report — from a free-text prompt or a known reportId. */
export function useRunReport() {
  return useMutation({
    mutationFn: reportsApi.run,
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Couldn't build that report.")
    },
  })
}
