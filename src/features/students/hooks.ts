"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@/lib/http"
import {
  classesApi,
  studentKeys,
  studentsApi,
  type StudentListParams,
} from "@/features/students/api"
import type {
  StudentCreateInput,
  StudentUpdateInput,
} from "@/features/students/schema"

export { studentKeys }

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => studentsApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => studentsApi.get(id),
    enabled: Boolean(id),
  })
}

export function useClassOptions() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: () => classesApi.list(),
    staleTime: 5 * 60_000,
  })
}

function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback)
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StudentCreateInput) => studentsApi.create(data),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: studentKeys.lists() })
      toast.success(`${student.fullName} added.`)
    },
    onError: (e) => reportError(e, "Couldn't add the student."),
  })
}

export function useUpdateStudent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StudentUpdateInput) => studentsApi.update(id, data),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: studentKeys.lists() })
      qc.setQueryData(studentKeys.detail(id), student)
      toast.success("Changes saved.")
    },
    onError: (e) => reportError(e, "Couldn't save changes."),
  })
}

export function useArchiveStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => studentsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all })
      toast.success("Student archived.")
    },
    onError: (e) => reportError(e, "Couldn't archive the student."),
  })
}
