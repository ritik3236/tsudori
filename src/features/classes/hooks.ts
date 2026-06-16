"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { classesApi } from "@/features/classes/api"
import type { ClassCreateInput, ClassUpdateInput } from "@/features/classes/schema"

export const classKeys = {
  all: ["classes"] as const,
  lists: () => [...classKeys.all, "list"] as const,
}

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

export function useClasses() {
  return useQuery({
    queryKey: classKeys.lists(),
    queryFn: () => classesApi.list(),
    staleTime: 60_000,
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClassCreateInput) => classesApi.create(data),
    onSuccess: (cls) => {
      qc.invalidateQueries({ queryKey: classKeys.all })
      toast.success(`"${cls.name}" created.`)
    },
    onError: (e) => reportError(e, "Couldn't create the class."),
  })
}

export function useUpdateClass(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClassUpdateInput) => classesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.all })
      toast.success("Changes saved.")
    },
    onError: (e) => reportError(e, "Couldn't save changes."),
  })
}
