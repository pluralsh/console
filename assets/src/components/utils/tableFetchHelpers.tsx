import { InputMaybe, PageInfoFragment } from 'generated/graphql'
import { Connection, PaginatedResult, extendConnection } from 'utils/graphql'
import { ApolloQueryResult, QueryResult } from '@apollo/client'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useEffect } from 'react'

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
