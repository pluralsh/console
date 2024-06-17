import { useCallback, useMemo, useState } from 'react'
import { VirtualItem } from '@tanstack/react-virtual'
import { extendConnection, updateNestedConnection } from 'utils/graphql'
import {
  reduceNestedData,
  useSlicePolling,
} from 'components/utils/tableFetchHelpers'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  ErrorPolicy,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
} from '@apollo/client'

export const DEFAULT_PAGE_SIZE = 100

type GenericQueryHook<TQueryType, TVariables extends OperationVariables> = (
  baseOptions: QueryHookOptions<TQueryType, TVariables>
) => QueryResult<TQueryType, TVariables> & {
  fetchMore: (options: any) => Promise<any>
}

type FetchDataOptions<TQueryType, TVariables extends OperationVariables> = {
  queryHook: GenericQueryHook<TQueryType, TVariables>
  pageSize?: number
  keyPath: string[]
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

  const queryKey = useMemo(
    () => options.keyPath[options.keyPath.length - 1],
    [options.keyPath]
  )

  const queryResult = options.queryHook({
    variables: {
      ...variables,
      first: options.pageSize ?? DEFAULT_PAGE_SIZE,
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
  const { pageInfo, reducedQueryResult } = useMemo(() => {
    const reducedData = reduceNestedData(options.keyPath, currentData)

    return {
      pageInfo: reducedData?.[queryKey]?.pageInfo,
      reducedQueryResult: { ...queryResult, data: reducedData as TQueryType },
    }
  }, [currentData, options.keyPath, queryKey, queryResult])

  const { refetch } = useSlicePolling(reducedQueryResult, {
    virtualSlice,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    interval: options.pollInterval || POLL_INTERVAL,
    keyPath: options.keyPath,
  })

  const fetchNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      fetchMore({
        variables: { after: pageInfo.endCursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          const newConnection = extendConnection(
            reduceNestedData(options.keyPath, prev),
            reduceNestedData(options.keyPath, fetchMoreResult)[queryKey],
            queryKey
          )

          return updateNestedConnection(options.keyPath, prev, newConnection)
        },
      })
    }
  }, [pageInfo, fetchMore, options.keyPath, queryKey])

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
