import {
  DocumentNode,
  LazyQueryExecFunction,
  useLazyQuery,
} from '@apollo/client'
import type { QueryHookOptions } from '@apollo/client/react/types/types'
import { Table } from '@pluralsh/design-system'
import { Row, SortingState, TableOptions } from '@tanstack/react-table'
import {
  Dispatch,
  ReactElement,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { useDataSelect } from './DataSelect'
import { ErrorToast } from './errors'
import {
  QueryName,
  Resource as ResourceT,
  ResourceList as ResourceListT,
  ResourceListItemsKey,
  ResourceVariables,
  toKind,
} from './types'

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
  queryDocument: DocumentNode
  queryOptions?: QueryHookOptions<TQuery, TVariables>
  queryName: QueryName<TQuery>
  itemsKey: ResourceListItemsKey<TResourceList>
  namespaced?: boolean
  customResource?: boolean
  disableOnRowClick?: boolean
  maxHeight?: string
  tableOptions?: Omit<TableOptions<any>, 'data' | 'columns' | 'getCoreRowModel'>
  setRefetch?: Dispatch<
    SetStateAction<Dispatch<LazyQueryExecFunction<TQuery, TVariables>>>
  >
}

export function ResourceList<
  TResourceList extends ResourceListT,
  TResource extends ResourceT,
  TQuery,
  TVariables extends ResourceVariables,
>({
  columns,
  initialSort,
  queryDocument,
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

  const pollInterval = 10_000 // 30 seconds
  const [fetch, { data, loading, fetchMore }] = useLazyQuery<
    TQuery,
    TVariables
  >(queryDocument!, {
    client: KubernetesClient(cluster?.id ?? ''),
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
    setRefetch?.(() => fetch)
    setNamespaced(namespaced)
  }, [fetch, namespaced, setNamespaced, setRefetch])

  useEffect(() => {
    // Initial fetch when component mounts
    fetch()

    // Set up polling to refetch data every pollInterval milliseconds
    const interval = setInterval(() => fetch({ context: {} }), pollInterval)
    return () => clearInterval(interval)
  }, [fetch])

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
          ...{
            meta: { ...reactTableOptions.meta, refetch: fetch, customResource },
          },
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
