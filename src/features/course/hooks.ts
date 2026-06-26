"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import { courseKeys, coursesApi } from "@/features/course/api"
import type { CourseCreateInput, CourseUpdateInput } from "@/features/course/schema"

export { courseKeys }

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

export function useCourses() {
  return useQuery({
    queryKey: courseKeys.lists(),
    queryFn: () => coursesApi.list(),
    staleTime: 60_000,
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CourseCreateInput) => coursesApi.create(data),
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: courseKeys.all })
      toast.success(`"${course.name}" created.`)
    },
    onError: (e) => reportError(e, "Couldn't create the course."),
  })
}

export function useUpdateCourse(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CourseUpdateInput) => coursesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courseKeys.all })
      toast.success("Changes saved.")
    },
    onError: (e) => reportError(e, "Couldn't save changes."),
  })
}
