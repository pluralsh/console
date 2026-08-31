import { Table } from '@pluralsh/design-system'
import {
  InfiniteData,
  QueryObserverResult,
  RefetchOptions,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query'
import { Row, SortingState, TableOptions } from '@tanstack/react-table'
import {
  Dispatch,
  ReactElement,
  SetStateAction,
  useEffect,
  useMemo,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts.tsx'
import { useCluster } from '../Cluster.tsx'

import { useDataSelect } from './DataSelect.tsx'
import {
  Error as ErrorT,
  Resource as ResourceT,
  ResourceList as ResourceListT,
  ResourceListItemsKey,
  toKind,
} from './types.ts'

import {
  DEFAULT_DATA_SELECT,
  ITEMS_PER_PAGE,
  useSortedTableOptions,
} from './utils.tsx'
import { ErrorToast } from './errors.tsx'

interface ResourceListProps<TResourceList> {
  columns: Array<object>
  initialSort?: SortingState
  queryOptions: (
    options: any
  ) => UseInfiniteQueryOptions<
    TResourceList,
    any,
    InfiniteData<TResourceList>,
    any,
    any
  >
  itemsKey?: ResourceListItemsKey<TResourceList>
  namespaced?: boolean
  customResource?: boolean
  disableOnRowClick?: boolean
  maxHeight?: string
  tableOptions?: Omit<TableOptions<any>, 'data' | 'columns' | 'getCoreRowModel'>
  pathParams?: object
  queryParams?: object
  setRefetch?: Dispatch<
    SetStateAction<
      Dispatch<
        (
          options?: RefetchOptions
        ) => Promise<QueryObserverResult<InfiniteData<TResourceList>, unknown>>
      >
    >
  >
}

export function ResourceList<
  TResourceList extends ResourceListT,
  TResource extends ResourceT,
>({
  columns,
  initialSort,
  queryOptions,
  namespaced = false,
  customResource = false,
  itemsKey,
  disableOnRowClick,
  maxHeight,
  tableOptions,
  pathParams,
  queryParams,
  setRefetch,
}: ResourceListProps<TResourceList>): ReactElement<any> {
  const navigate = useNavigate()
  const { clusterId: clusterIdParam } = useParams()
  const cluster = useCluster()
  // Route param is the source of truth while context cluster is still resolving.
  const requestClusterId = clusterIdParam || cluster?.id || ''
  const { filter, namespace, setNamespaced } = useDataSelect()
  const { sortBy, reactTableOptions } = useSortedTableOptions(initialSort, {
    ...tableOptions,
    meta: { cluster, ...tableOptions?.meta },
  })

  const options = queryOptions({
    client: AxiosInstance(requestClusterId),
    path: { ...(namespaced ? { namespace } : undefined), ...pathParams },
    query: {
      filterBy: `name,${filter}`,
      sortBy: sortBy,
      ...DEFAULT_DATA_SELECT,
      ...queryParams,
    },
  })

  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery<TResourceList>({
      ...options,
      queryKey: [...options.queryKey, 'clusterId ', requestClusterId], // Add clusterId to queryKey to refetch when cluster changes
      enabled: !!requestClusterId,
      initialPageParam: DEFAULT_DATA_SELECT.page,
      getNextPageParam: (lastPage, allPages) => {
        const pages = allPages.length
        const totalItems = lastPage.listMeta?.totalItems ?? 0
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
        return pages < totalPages ? pages + 1 : undefined
      },
      refetchInterval: 30_000,
    })

  const { items, errors } = useMemo(
    () => ({
      items:
        data?.pages.flatMap((value) =>
          itemsKey ? (value?.[itemsKey] as Array<TResource>) : []
        ) ?? [],
      errors: (data?.pages.flatMap((value) => value?.errors ?? []) ??
        []) as Array<ErrorT>,
    }),
    [data?.pages, itemsKey]
  )

  useEffect(() => {
    setRefetch?.(() => refetch)
    setNamespaced(namespaced)
  }, [namespaced, setNamespaced, refetch, setRefetch])

  return (
    <>
      <ErrorToast errors={errors} />
      <Table
        fullHeightWrap
        data={items}
        columns={columns}
        loading={isLoading && items.length === 0}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetching}
        reactTableOptions={{
          ...reactTableOptions,
          ...{
            meta: { ...reactTableOptions.meta, customResource, refetch },
          },
        }}
        virtualizeRows
        onRowClick={
          disableOnRowClick || isLoading
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
