import { Dispatch, ReactElement, useCallback, useEffect, useMemo } from 'react'
import type {
  QueryHookOptions,
  QueryResult,
} from '@apollo/client/react/types/types'
import { Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import { Row, SortingState, TableOptions } from '@tanstack/react-table'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { useDataSelect } from './DataSelect'
import {
  QueryName,
  Resource as ResourceT,
  ResourceList as ResourceListT,
  ResourceListItemsKey,
  ResourceVariables,
  toKind,
} from './types'
import { ErrorToast } from './errors'

import {
  DEFAULT_DATA_SELECT,
  extendConnection,
  usePageInfo,
  useSortedTableOptions,
} from './utils'

interface ResourceListProps<
  TResourceList,
  TQuery,
  TVariables extends ResourceVariables,
> {
  columns: Array<object>
  initialSort?: SortingState
  query: (
    baseOptions: QueryHookOptions<TQuery, TVariables>
  ) => QueryResult<TQuery, TVariables>
  queryOptions?: QueryHookOptions<TQuery, TVariables>
  queryName: QueryName<TQuery>
  itemsKey: ResourceListItemsKey<TResourceList>
  namespaced?: boolean
  customResource?: boolean
  disableOnRowClick?: boolean
  maxHeight?: string
  tableOptions?: Omit<TableOptions<any>, 'data' | 'columns' | 'getCoreRowModel'>
  setRefetch?: Dispatch<Dispatch<(variables?: Partial<TVariables>) => unknown>>
}

export function ResourceList<
  TResourceList extends ResourceListT,
  TResource extends ResourceT,
  TQuery,
  TVariables extends ResourceVariables,
>({
  columns,
  initialSort,
  query,
  queryOptions,
  namespaced = false,
  customResource = false,
  queryName,
  itemsKey,
  disableOnRowClick,
  maxHeight,
  tableOptions,
  setRefetch,
}: ResourceListProps<TResourceList, TQuery, TVariables>): ReactElement<any> {
  const navigate = useNavigate()
  const cluster = useCluster()
  const { setNamespaced, namespace, filter } = useDataSelect()
  const { sortBy, reactTableOptions } = useSortedTableOptions(initialSort, {
    meta: { cluster, ...tableOptions },
  })

  const { data, loading, fetchMore, refetch } = query({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    pollInterval: 30_000,
    fetchPolicy: 'cache-and-network',
    variables: {
      filterBy: `name,${filter}`,
      sortBy,
      ...(namespaced ? { namespace } : {}),
      ...(queryOptions?.variables ?? {}),
      ...DEFAULT_DATA_SELECT,
    } as TVariables,
  })

  const resourceList = data?.[queryName] as TResourceList
  const isLoading = loading && !resourceList
  const items = useMemo(
    () => (resourceList?.[itemsKey] as Array<TResource>) ?? [],
    [itemsKey, resourceList]
  )
  const { page, hasNextPage } = usePageInfo(items, resourceList?.listMeta)

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult, queryName, itemsKey),
    })
  }, [fetchMore, hasNextPage, page, queryName, itemsKey])

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  useEffect(() => {
    setNamespaced(namespaced)
  }, [setNamespaced, namespaced])

  return (
    <>
      <ErrorToast errors={resourceList?.errors} />
      <Table
        fullHeightWrap
        data={items}
        columns={columns}
        loading={isLoading}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={{
          ...reactTableOptions,
          ...{ meta: { ...reactTableOptions.meta, refetch, customResource } },
        }}
        virtualizeRows
        onRowClick={
          disableOnRowClick || loading
            ? undefined
            : (_, row: Row<ResourceT>) => {
                navigate(
                  customResource
                    ? getCustomResourceDetailsAbsPath(
                        cluster?.id,
                        row.original.typeMeta.kind!,
                        row.original.objectMeta.name!,
                        row.original.objectMeta.namespace
                      )
                    : getResourceDetailsAbsPath(
                        cluster?.id,
                        toKind(row.original.typeMeta.kind!),
                        row.original.objectMeta.name!,
                        row.original.objectMeta.namespace
                      )
                )
              }
        }
        css={{
          maxHeight: maxHeight ?? 'unset',
          height: '100%',
        }}
      />
    </>
  )
}
