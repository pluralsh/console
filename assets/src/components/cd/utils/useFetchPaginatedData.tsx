import { useCallback, useState } from 'react'
import { VirtualItem } from '@tanstack/react-virtual'
import { extendConnection } from 'utils/graphql'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  ErrorPolicy,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
} from '@apollo/client'

type GenericQueryHook<TQueryType, TVariables extends OperationVariables> = (
  baseOptions: QueryHookOptions<TQueryType, TVariables>
) => QueryResult<TQueryType, TVariables> & {
  fetchMore: (options: any) => Promise<any>
}

type FetchDataOptions<TQueryType, TVariables extends OperationVariables> = {
  queryHook: GenericQueryHook<TQueryType, TVariables>
  pageSize: number
  queryKey: string
  pollInterval?: number
  errorPolicy?: ErrorPolicy
}

export function useFetchPaginatedData<
  TQueryType extends Partial<Record<string, any>>,
  TVariables extends OperationVariables,
>(
  options: FetchDataOptions<TQueryType, TVariables>,
  variables: TVariables = {} as TVariables
) {
  const [virtualSlice, setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  const queryResult = options.queryHook({
    variables: {
      ...variables,
      first: options.pageSize,
    },
    errorPolicy: options.errorPolicy,
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })

  const {
    data: currentData,
    previousData,
    loading,
    error,
    fetchMore,
  } = queryResult

  const data = currentData || previousData
  const pageInfo = currentData?.[options.queryKey]?.pageInfo

  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: options.pageSize,
    key: options.queryKey,
    interval: options.pollInterval || POLL_INTERVAL,
  })

  const fetchNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      fetchMore({
        variables: { after: pageInfo.endCursor },
        updateQuery: (prev, { fetchMoreResult }) =>
          extendConnection(
            prev as Partial<Record<string, any>>,
            fetchMoreResult[options.queryKey],
            options.queryKey
          ),
      })
    }
  }, [fetchMore, pageInfo, options.queryKey])

  return {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  }
}
