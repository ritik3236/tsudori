"use client"

import {
  keepPreviousData,
  useInfiniteQuery,
  type QueryKey,
} from "@tanstack/react-query"

/** The page shape every offset-paged list speaks: a slice of items, the cursor
 *  for the next slice (null when exhausted), and the unfiltered total. */
export type InfinitePage<T> = {
  items: T[]
  nextOffset: number | null
  total: number
}

/**
 * Thin wrapper over useInfiniteQuery for offset-paged lists. Centralises the
 * initialPageParam/getNextPageParam wiring and flattens the result into the
 * shape the list UIs actually consume. Pair with <InfiniteSentinel/> to fetch
 * the next page as the user scrolls.
 */
export function useInfiniteList<T>({
  queryKey,
  queryFn,
  enabled,
  keepPrevious,
}: {
  queryKey: QueryKey
  queryFn: (offset: number) => Promise<InfinitePage<T>>
  enabled?: boolean
  /** Keep the prior key's data on screen while a new key loads (e.g. switching
   *  month/filter), instead of flashing a skeleton. */
  keepPrevious?: boolean
}) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  })

  return {
    items: query.data?.pages.flatMap((p) => p.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    isPlaceholder: query.isPlaceholderData,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
  }
}
