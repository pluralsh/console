import { useEffect } from 'react'

export function useEnsurePagedItem<T extends { id: string }>(
  items: T[],
  id: string | null | undefined,
  {
    data,
    loading,
    hasNextPage,
    fetchNextPage,
  }: {
    data?: unknown
    loading: boolean
    hasNextPage?: boolean | null
    fetchNextPage: () => void
  }
): { item: T | null; waiting: boolean } {
  const item = items.find((candidate) => candidate.id === id) ?? null
  const waiting = !!id && !item && (!data || loading || !!hasNextPage)

  useEffect(() => {
    if (!waiting || loading) return

    fetchNextPage()
  }, [fetchNextPage, loading, waiting])

  return { item, waiting }
}
