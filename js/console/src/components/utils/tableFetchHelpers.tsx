import { QueryResult } from '@apollo/client'
import { usePrevious } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { InputMaybe } from 'generated/graphql'
import { findLastIndex } from 'lodash'

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
    ...fetchSliceOpts
  }: { interval?: number; skip?: boolean } & FetchSliceOptions
) {
  const { loading, refetch: originalRefetch } = queryResult
  const { virtualSlice, pageSize } = fetchSliceOpts

  const fetchSlice = useFetchSlice(queryResult, fetchSliceOpts)
  const { refetchLoaded, loadedCount } = useRefetchLoaded(
    queryResult,
    fetchSliceOpts
  )
  // Virtualized tables report the visible slice and only poll that. Lists
  // that don't (boards, card grids) poll everything loaded so far, since a
  // plain refetch returns just the first page and drops the rest.
  const refetch = virtualSlice?.start?.index
    ? fetchSlice
    : !virtualSlice && loadedCount > pageSize
      ? refetchLoaded
      : originalRefetch

  const poll = useEffectEvent(() => {
    refetch()
  })

  useEffect(() => {
    if (interval === 0 || skip || loading) return

    const intervalId = setInterval(() => poll(), interval)

    return () => clearInterval(intervalId)
  }, [interval, loading, skip])

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

// Most pages one poll re-fetches for lists without a virtual slice.
const MAX_POLLED_PAGES = 3

// Re-fetches loaded items from the start, up to MAX_POLLED_PAGES pages. With
// at most that many loaded, the polled connection replaces the loaded one, so
// updates, additions and removals all come through. Beyond that, the polled
// head replaces the start of the list and the older items are kept as they
// are, together with the existing cursor for loading more.
function useRefetchLoaded<
  QData,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
>(
  queryResult: QueryResult<QData, QVariables>,
  { keyPath, pageSize }: Pick<FetchSliceOptions, 'keyPath' | 'pageSize'>
) {
  const queryKey = keyPath[keyPath.length - 1]
  const loadedCount: number = queryResult?.data?.[queryKey]?.edges?.length ?? 0
  const polledCount = Math.min(loadedCount, pageSize * MAX_POLLED_PAGES)
  const { fetchMore } = queryResult

  const refetchLoaded = useCallback(
    () =>
      fetchMore({
        variables: { first: polledCount, after: null },
        updateQuery: (prev, { fetchMoreResult }) => {
          const nextParent = reduceNestedData(keyPath, fetchMoreResult)
          const next = nextParent?.[queryKey]
          if (!next) return prev
          const prevParent = reduceNestedData(keyPath, prev)
          const prevConnection = prevParent?.[queryKey]
          const prevEdges: any[] = prevConnection?.edges ?? []
          // fields next to the connection (e.g. counts) come from the poll
          const parent = { ...prevParent, ...nextParent }

          if (prevEdges.length <= polledCount)
            return updateNestedConnection(keyPath, prev, {
              ...parent,
              [queryKey]: next,
            })

          // keep what follows the last loaded item that is still in the
          // polled head, so items shifted out of it (new ones on top) aren't
          // lost and ones removed from it don't come back
          const polledIds = new Set(
            (next.edges ?? []).map((edge) => edge?.node?.id)
          )
          const lastPolled = findLastIndex(prevEdges, (edge) =>
            polledIds.has(edge?.node?.id)
          )
          const tail = prevEdges
            .slice(lastPolled >= 0 ? lastPolled + 1 : polledCount)
            .filter((edge) => !polledIds.has(edge?.node?.id))

          // fresh connection fields (e.g. totalCount), but the loaded cursor
          return updateNestedConnection(keyPath, prev, {
            ...parent,
            [queryKey]: {
              ...prevConnection,
              ...next,
              pageInfo: prevConnection?.pageInfo,
              edges: [...(next.edges ?? []), ...tail],
            },
          })
        },
      }),
    [fetchMore, keyPath, polledCount, queryKey]
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
