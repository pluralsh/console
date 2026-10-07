import { QueryResult } from '@apollo/client'
import { usePrevious } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { InputMaybe } from 'generated/graphql'

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react'
import { extendConnection, updateNestedConnection } from 'utils/graphql'
import { VirtualSlice } from './table/useFetchPaginatedData'

type FetchSliceOptions = {
  keyPath: string[]
  virtualSlice: VirtualSlice | undefined
  pageSize: number
}

export function useSlicePolling<
  QData,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
>(
  queryResult: QueryResult<QData, QVariables>,
  {
    interval = POLL_INTERVAL,
    skip = false,
    keepLoadedPages = false,
    ...fetchSliceOpts
  }: {
    interval?: number
    skip?: boolean
    keepLoadedPages?: boolean
  } & FetchSliceOptions
) {
  const { loading, refetch: originalRefetch } = queryResult
  const { virtualSlice, pageSize } = fetchSliceOpts

  const fetchSlice = useFetchSlice(queryResult, fetchSliceOpts)
  const { refetchLoaded, loadedCount } = useRefetchLoaded(
    queryResult,
    fetchSliceOpts
  )
  // Virtualized tables report the visible slice and only poll that. Other
  // lists poll the first page, which drops any further loaded pages, unless
  // they opt into keeping them: then everything loaded is polled.
  const pollsLoaded = keepLoadedPages && !virtualSlice
  const refetch = virtualSlice?.start?.index
    ? fetchSlice
    : pollsLoaded && loadedCount > pageSize
      ? refetchLoaded
      : originalRefetch
  // past the ceiling, polling pauses until the list resets (e.g. new filters)
  const paused = pollsLoaded && loadedCount > MAX_POLLED_ITEMS

  const poll = useEffectEvent(() => {
    refetch()
  })

  useEffect(() => {
    if (interval === 0 || skip || loading || paused) return

    const intervalId = setInterval(() => poll(), interval)

    return () => clearInterval(intervalId)
  }, [interval, loading, paused, skip])

  return useMemo(() => ({ refetch }), [refetch])
}

export function useFetchSlice<
  QData,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
>(queryResult: QueryResult<QData, QVariables>, options: FetchSliceOptions) {
  const { virtualSlice, pageSize, keyPath } = options
  const queryKey = useMemo(() => keyPath[keyPath.length - 1], [keyPath])
  const [endCursors, setEndCursors] = useState<
    { index: number; cursor: string }[]
  >([])
  const endCursor = queryResult?.data?.[queryKey]?.pageInfo?.endCursor
  const endCursorIndex = (queryResult?.data?.[queryKey]?.edges?.length ?? 0) - 1
  const prevEndCursor = usePrevious(endCursor)

  useEffect(() => {
    if (endCursor && endCursor !== prevEndCursor && endCursorIndex >= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndCursors((prev) =>
        [
          ...(virtualSlice?.start?.index !== 0 ? prev : []),
          { index: endCursorIndex, cursor: endCursor },
        ].sort((a, b) => b.index - a.index)
      )
    }
  }, [endCursor, endCursorIndex, prevEndCursor, virtualSlice?.start?.index])

  const { first, after } = useMemo(() => {
    const startIndex = virtualSlice?.start?.index ?? 0
    const endIndex = virtualSlice?.end?.index ?? 0
    const cursor = endCursors.find((c) => c.index < startIndex)

    return {
      first:
        Math.max(pageSize, endIndex - (cursor?.index || 0) + 1) ||
        queryResult.variables?.first,
      after: cursor?.cursor || queryResult.variables?.after,
    }
  }, [
    endCursors,
    pageSize,
    queryResult.variables?.after,
    queryResult.variables?.first,
    virtualSlice?.end?.index,
    virtualSlice?.start?.index,
  ])

  const { fetchMore } = queryResult

  return useCallback(
    () =>
      fetchMore({
        variables: { after, first },
        updateQuery: (prev, { fetchMoreResult }) =>
          extendNestedConnection(keyPath, prev, fetchMoreResult),
      }),
    [fetchMore, after, first, keyPath]
  )
}

// Most loaded items that lists keeping their loaded pages still poll.
export const MAX_POLLED_ITEMS = 500

// Re-fetches every loaded item from the start and replaces the loaded list
// with the result, so updates, additions, removals, counts and the cursor for
// loading more all stay exact.
function useRefetchLoaded<
  QData,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
>(
  queryResult: QueryResult<QData, QVariables>,
  { keyPath }: Pick<FetchSliceOptions, 'keyPath'>
) {
  const queryKey = keyPath[keyPath.length - 1]
  const loadedCount: number = queryResult?.data?.[queryKey]?.edges?.length ?? 0
  const { fetchMore } = queryResult

  const refetchLoaded = useCallback(
    () =>
      fetchMore({
        variables: { first: loadedCount, after: null },
        updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ?? prev,
      }),
    [fetchMore, loadedCount]
  )

  return { refetchLoaded, loadedCount }
}

export const reduceNestedData = (path: string[], data: any) =>
  path.slice(0, -1).reduce((acc, key) => acc?.[key], data)

// Appends a fetched page to the loaded connection. Fields next to the
// connection (e.g. counts) and on it (e.g. totalCount) come from the newer
// response, so they stay current as pages load.
export function extendNestedConnection<TData>(
  keyPath: string[],
  prev: TData,
  fetchMoreResult: Nullable<TData>
): TData {
  const queryKey = keyPath[keyPath.length - 1]
  const prevParent = reduceNestedData(keyPath, prev)
  const nextParent = reduceNestedData(keyPath, fetchMoreResult)

  return updateNestedConnection(
    keyPath,
    prev,
    extendConnection(
      { ...prevParent, ...nextParent, [queryKey]: prevParent?.[queryKey] },
      nextParent?.[queryKey],
      queryKey
    )
  )
}
