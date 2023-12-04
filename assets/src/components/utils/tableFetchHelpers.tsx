import { InputMaybe, PageInfoFragment } from 'generated/graphql'
import {
  Connection,
  PaginatedResult,
  extendConnection,
  updateConnection,
} from 'utils/graphql'
import { ApolloQueryResult, QueryResult } from '@apollo/client'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { VirtualItem } from '@tanstack/react-virtual'
import { usePrevious } from 'honorable'
import { FetchMoreQueryOptions } from 'apollo-boost'

type FetchMoreT<
  TData extends Partial<
    Record<K, (Connection<any> & PaginatedResult<any>) | null>
  >,
  K extends string,
  TVariables extends { after: string | null | undefined } = {
    after: string | null | undefined
  },
> = (
  fetchMoreOptions: { variables: TVariables } & {
    updateQuery?: (
      previousQueryResult: TData,
      options: {
        fetchMoreResult: TData
      }
    ) => TData
  }
) => Promise<ApolloQueryResult<TData>>

type FetchSliceOptions<K extends string> = {
  key: K
  virtualSlice: { start: VirtualItem; end: VirtualItem } | undefined
  pageSize: number
}

export function fetchMoreAndExtend<
  TData extends Partial<
    Record<K, (Connection<any> & PaginatedResult<any>) | null>
  >,
  K extends string,
>({
  fetchMore,
  pageInfo,
  key,
}: {
  pageInfo: PageInfoFragment | null | undefined
  fetchMore: FetchMoreT<TData, K>
  key: K
}) {
  if (!pageInfo?.endCursor) {
    return
  }
  fetchMore({
    variables: { after: pageInfo.endCursor },
    updateQuery: (prev, { fetchMoreResult }) => {
      const ret = extendConnection(prev, fetchMoreResult[key], key)

      return ret
    },
  })
}

export function useSlicePolling<
  QData extends Partial<Record<K, any>>,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
  K extends string,
>(
  queryResult: QueryResult<QData, QVariables>,
  {
    interval = POLL_INTERVAL,
    ...fetchSliceOpts
  }: { interval?: number } & FetchSliceOptions<K>
) {
  const { data, loading, refetch: originalRefetch } = queryResult
  const edges = data?.[fetchSliceOpts.key]?.edges
  const fetchSlice = useFetchSlice(queryResult, fetchSliceOpts)
  const refetch = !fetchSliceOpts?.virtualSlice?.start?.index
    ? originalRefetch
    : fetchSlice

  useEffect(() => {
    if (!edges) {
      return
    }
    let intervalId

    if (!loading) {
      intervalId = setInterval(() => {
        refetch()
      }, interval)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [edges, interval, loading, refetch])

  return useMemo(
    () => ({
      refetch,
    }),
    [refetch]
  )
}

export function fetchMoreAndUpdate<
  QData extends Partial<Record<K, any>>,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
  K extends string,
>(
  queryResult: Pick<QueryResult<QData, QVariables>, 'fetchMore' | 'variables'>,
  key: K,
  queryVariables?: FetchMoreQueryOptions<
    QVariables,
    'first' | 'after'
  >['variables']
) {
  const first = queryVariables?.first || queryResult.variables?.first
  const after = queryVariables?.after || queryResult.variables?.after

  queryResult.fetchMore({
    variables: { after, first },
    updateQuery: (prev, next) =>
      updateConnection(prev, next.fetchMoreResult[key], key),
  })
}

export function useFetchSlice<
  QData extends Partial<Record<K, any>>,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
  K extends string,
>(queryResult: QueryResult<QData, QVariables>, options: FetchSliceOptions<K>) {
  const { virtualSlice, pageSize, key } = options
  const [endCursors, setEndCursors] = useState<
    { index: number; cursor: string }[]
  >([])
  const endCursor = queryResult?.data?.[key]?.pageInfo.endCursor
  const endCursorIndex = (queryResult?.data?.[key]?.edges?.length ?? 0) - 1
  const prevEndCursor = usePrevious(endCursor)

  useEffect(() => {
    if (endCursor && endCursor !== prevEndCursor && endCursorIndex >= 0) {
      setEndCursors((prev) =>
        [
          ...(virtualSlice?.start?.index !== 0 ? prev : []),
          { index: endCursorIndex, cursor: endCursor },
        ].sort((a, b) => b.index - a.index)
      )
    }
  }, [endCursor, endCursorIndex, prevEndCursor, virtualSlice?.start?.index])

  const fetchSlice = useCallback(() => {
    const startIndex = virtualSlice?.start?.index ?? 0
    const endIndex = virtualSlice?.end?.index ?? 0
    const cursor = endCursors.find((c) => c.index < startIndex)
    const first = Math.max(pageSize, endIndex - (cursor?.index || 0) + 1)

    fetchMoreAndUpdate(queryResult, key, {
      first,
      after: cursor?.cursor,
    })
  }, [
    endCursors,
    key,
    pageSize,
    queryResult,
    virtualSlice?.end?.index,
    virtualSlice?.start?.index,
  ])

  return fetchSlice
}
