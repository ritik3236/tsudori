"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { instituteApi } from "@/features/institute/api"
import type { InstituteUpdateInput } from "@/features/institute/schema"

export const instituteKeys = {
  all: ["institutes"] as const,
}

export function useUpdateInstitute() {
  return useMutation({
    mutationFn: (data: InstituteUpdateInput) => instituteApi.update(data),
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't save changes."),
  })
}

/** All institutes (super-admin switcher/picker). Lazy: pass `enabled` so it only
 *  fetches once the menu opens. */
export function useAllInstitutes(enabled: boolean) {
  return useQuery({
    queryKey: instituteKeys.all,
    queryFn: () => instituteApi.listAll(),
    staleTime: 5 * 60_000,
    enabled,
  })
}
