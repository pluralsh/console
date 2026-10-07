import {
  ErrorPolicy,
  NetworkStatus,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  WatchQueryFetchPolicy,
} from '@apollo/client'
import { TableProps } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  extendNestedConnection,
  isStaleResponse,
  reduceNestedData,
  useSlicePolling,
} from 'components/utils/tableFetchHelpers'
import { PageInfoFragment } from 'generated/graphql'
import { Dispatch, useCallback, useMemo, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 100

export type GenericQueryHook<
  TQueryType,
  TVariables extends OperationVariables,
> = (
  baseOptions: QueryHookOptions<TQueryType, TVariables> &
    ({ variables: TVariables; skip?: boolean } | { skip: boolean })
) => QueryResult<TQueryType, TVariables> & {
  fetchMore: (options: any) => Promise<any>
}

export type FetchPaginatedDataOptions<
  TQueryType,
  TVariables extends OperationVariables,
> = {
  queryHook: GenericQueryHook<TQueryType, TVariables>
  pageSize?: number
  keyPath: string[]
  pollInterval?: number
  errorPolicy?: ErrorPolicy
  fetchPolicy?: WatchQueryFetchPolicy
  skip?: boolean
  // Lists that don't report a virtual slice (boards, card lists) normally
  // poll only the first page, dropping further loaded pages. With this set
  // they poll every loaded item instead, pausing past `MAX_POLLED_ITEMS`.
  keepLoadedPages?: boolean
}

// could also export this directly from DS
export type VirtualSlice = Parameters<
  NonNullable<TableProps['onVirtualSliceChange']>
>[0]

export type FetchPaginatedDataResult<TQueryType> = {
  data: TQueryType | undefined
  loading: boolean
  error: any
  refetch: () => Promise<any>
  pageInfo: PageInfoFragment
  fetchNextPage: Dispatch<void>
  // `undefined` clears it, e.g. when the table is no longer shown
  setVirtualSlice: (slice: VirtualSlice | undefined) => void
  /**
   * True while a fetchMore request is in flight. That includes the polls of
   * lists with `keepLoadedPages` or a scrolled virtual slice, which poll
   * through fetchMore; first-page polls and refetches leave it false.
   */
  fetchingMore: boolean
}

export function useFetchPaginatedData<
  TQueryType extends Partial<Record<string, any>>,
  TVariables extends OperationVariables,
>(
  options: FetchPaginatedDataOptions<TQueryType, TVariables>,
  variables: TVariables = {} as TVariables
): FetchPaginatedDataResult<TQueryType> {
  const [virtualSlice, setVirtualSlice] = useState<VirtualSlice | undefined>()

  const queryKey = useMemo(
    () => options.keyPath[options.keyPath.length - 1],
    [options.keyPath]
  )

  const queryResult = options.queryHook({
    variables: {
      first: options.pageSize ?? DEFAULT_PAGE_SIZE,
      ...variables,
    },
    skip: options.skip,
    errorPolicy: options.errorPolicy,
    fetchPolicy: options.fetchPolicy ?? 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })

  const {
    data: currentData,
    previousData,
    loading,
    error,
    fetchMore,
    networkStatus,
    observable,
  } = queryResult

  const data = currentData || previousData
  const fetchingMore = networkStatus === NetworkStatus.fetchMore
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
    interval: options.pollInterval ?? POLL_INTERVAL,
    keyPath: options.keyPath,
    skip: options.skip,
    keepLoadedPages: options.keepLoadedPages,
  })

  const fetchNextPage = useCallback(() => {
    if (pageInfo?.hasNextPage) {
      fetchMore({
        variables: { after: pageInfo?.endCursor },
        updateQuery: (prev, { fetchMoreResult, variables: sent }) =>
          isStaleResponse(observable, sent)
            ? prev
            : extendNestedConnection(options.keyPath, prev, fetchMoreResult),
      })
    }
  }, [
    pageInfo?.hasNextPage,
    pageInfo?.endCursor,
    fetchMore,
    options.keyPath,
    observable,
  ])

  return {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
    fetchingMore,
  }
}
