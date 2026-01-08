import { Table } from '@pluralsh/design-system'
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query'
import { Row, SortingState, TableOptions } from '@tanstack/react-table'
import { ReactElement, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { useDataSelect } from './DataSelect'
import {
  Resource as ResourceT,
  ResourceList as ResourceListT,
  ResourceListItemsKey,
  toKind,
} from './updatedtypes.ts'

import {
  DEFAULT_DATA_SELECT,
  ITEMS_PER_PAGE,
  useSortedTableOptions,
} from './utils'

interface ResourceListProps<TResourceList> {
  columns: Array<object>
  initialSort?: SortingState
  queryOptions: (
    options: any
  ) => UseInfiniteQueryOptions<
    TResourceList,
    Error,
    InfiniteData<TResourceList>
  >
  itemsKey?: ResourceListItemsKey<TResourceList>
  namespaced?: boolean
  customResource?: boolean
  disableOnRowClick?: boolean
  maxHeight?: string
  tableOptions?: Omit<TableOptions<any>, 'data' | 'columns' | 'getCoreRowModel'>
}

export function UpdatedResourceList<
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
}: ResourceListProps<TResourceList>): ReactElement<any> {
  const navigate = useNavigate()
  const cluster = useCluster()
  const { filter, namespace, setNamespaced } = useDataSelect()
  const { sortBy, reactTableOptions } = useSortedTableOptions(initialSort, {
    meta: { cluster, ...tableOptions },
  })

  const { data, isFetching, hasNextPage, fetchNextPage } =
    useInfiniteQuery<TResourceList>({
      ...queryOptions({
        client: AxiosInstance(cluster?.id ?? ''),
        path: namespaced ? { namespace } : undefined,
        query: {
          filterBy: `name,${filter}`,
          sortBy: sortBy,
          ...DEFAULT_DATA_SELECT,
        },
      }),
      initialPageParam: DEFAULT_DATA_SELECT.page,
      getNextPageParam: (lastPage, allPages) => {
        const pages = allPages.length
        const totalItems = lastPage.listMeta?.totalItems ?? 0
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
        return pages < totalPages ? pages + 1 : undefined
      },
    })

  console.log(data)

  const items = useMemo(
    () =>
      data?.pages.flatMap((value) =>
        itemsKey ? (value?.[itemsKey] as Array<TResource>) : []
      ) ?? [],
    [data?.pages, itemsKey]
  )

  useEffect(() => setNamespaced(namespaced), [namespaced, setNamespaced])

  return (
    <>
      {/*<ErrorToast errors={resourceList?.errors as any} />*/}
      <Table
        fullHeightWrap
        data={items}
        columns={columns}
        loading={isFetching && items.length === 0}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetching}
        reactTableOptions={{
          ...reactTableOptions,
          ...{
            meta: { ...reactTableOptions.meta, customResource },
          },
        }}
        virtualizeRows
        onRowClick={
          disableOnRowClick || isFetching
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
