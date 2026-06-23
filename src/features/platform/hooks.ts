"use client"

import { useInfiniteList } from "@/lib/use-infinite-list"
import {
  platformApi,
  platformKeys,
  type PlatformStudentParams,
} from "@/features/platform/api"

export { platformKeys }

// Infinite scroll over the cross-tenant student list; keepPrevious so changing
// search/filter doesn't flash a skeleton. Mirrors useStudents.
export function usePlatformStudents(params: PlatformStudentParams) {
  return useInfiniteList({
    queryKey: platformKeys.students(params),
    queryFn: (offset) => platformApi.students(params, offset),
    keepPrevious: true,
  })
}
