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
    ...fetchSliceOpts
  }: { interval?: number; skip?: boolean } & FetchSliceOptions
) {
  const { loading, refetch: originalRefetch } = queryResult

  const fetchSlice = useFetchSlice(queryResult, fetchSliceOpts)
  const refetch = !fetchSliceOpts?.virtualSlice?.start?.index
    ? originalRefetch
    : fetchSlice

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
        updateQuery: (prev, { fetchMoreResult }) => {
          const newConnection = extendConnection(
            reduceNestedData(keyPath, prev),
            reduceNestedData(keyPath, fetchMoreResult)[queryKey],
            queryKey
          )

          return updateNestedConnection(keyPath, prev, newConnection)
        },
      }),
    [fetchMore, after, first, keyPath, queryKey]
  )
}

export const reduceNestedData = (path: string[], data: any) =>
  path.slice(0, -1).reduce((acc, key) => acc?.[key], data)
