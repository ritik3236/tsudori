"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { instituteApi } from "@/features/institute/api"
import type { InstituteUpdateInput } from "@/features/institute/schema"

export function useUpdateInstitute() {
  return useMutation({
    mutationFn: (data: InstituteUpdateInput) => instituteApi.update(data),
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't save changes."),
  })
}
