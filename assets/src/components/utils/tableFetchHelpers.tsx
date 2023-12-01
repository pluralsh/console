import { InputMaybe, PageInfoFragment } from 'generated/graphql'
import {
  Connection,
  PaginatedResult,
  extendConnection,
  updateConnection,
} from 'utils/graphql'
import { ApolloQueryResult, QueryResult } from '@apollo/client'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useCallback, useEffect, useState } from 'react'
import { VirtualItem } from '@tanstack/react-virtual'
import { usePrevious } from 'honorable'

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

export function useFetchMorePolling<
  QData extends Partial<Record<K, any>>,
  QVariables extends {
    first?: InputMaybe<number> | undefined
    after?: InputMaybe<string> | undefined
  },
  K extends string,
>(
  queryResult: QueryResult<QData, QVariables>,
  key: K,
  interval: number = POLL_INTERVAL
) {
  const { variables, data, loading, refetch } = queryResult
  const edges = data?.[key]?.edges

  useEffect(() => {
    if (!edges) {
      return
    }
    let intervalId

    if (!loading) {
      intervalId = setInterval(() => {
        const total = edges?.length || 0

        if (!variables) {
          return
        }
        refetch({
          ...(variables || {}),
          first: total,
        })
      }, interval)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [edges, interval, key, loading, refetch, variables])
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
  queryVariables?: Nullable<QVariables>
) {
  const first = queryVariables?.first || queryResult.variables?.first
  const after = queryVariables?.after || queryResult.variables?.after

  queryResult.fetchMore({
    variables: { after, first },
    updateQuery: (prev, next) =>
      updateConnection(prev, next.fetchMoreResult[key], key),
  })
}

export function useFetchSlice(
  queryResult,
  options: {
    virtualSlice: { start: VirtualItem; end: VirtualItem } | undefined
    pageSize: number
  }
) {
  const { virtualSlice, pageSize } = options
  const [endCursors, setEndCursors] = useState<
    { index: number; cursor: string }[]
  >([])
  const dataKey = 'serviceDeployments' as const
  const endCursor = queryResult?.data?.[dataKey]?.pageInfo.endCursor
  const endCursorIndex = (queryResult?.data?.[dataKey]?.edges?.length ?? 0) - 1
  const prevEndCursor = usePrevious(endCursor)

  useEffect(() => {
    if (endCursor && endCursor !== prevEndCursor && endCursorIndex >= 0) {
      console.log('new end cursor', endCursor)
      setEndCursors((prev) =>
        [...prev, { index: endCursorIndex, cursor: endCursor }].sort(
          (a, b) => b.index - a.index
        )
      )
    }
  }, [endCursor, endCursorIndex, prevEndCursor])
  console.log('endCursors', endCursors)

  const fetchMoreThing = useCallback(() => {
    const startIndex = virtualSlice?.start?.index ?? 0
    const endIndex = virtualSlice?.end?.index ?? 0
    const cursor = endCursors.find((c) => c.index < startIndex)
    const first = Math.max(pageSize, endIndex - (cursor?.index || 0) + 1)

    fetchMoreAndUpdate(queryResult, 'serviceDeployments', {
      after: cursor?.cursor,
      first,
    })
  }, [
    endCursors,
    pageSize,
    queryResult,
    virtualSlice?.end?.index,
    virtualSlice?.start?.index,
  ])

  return fetchMoreThing
}
