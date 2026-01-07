import { Table } from '@pluralsh/design-system'
import {
  keepPreviousData,
  type UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import { Row, SortingState, TableOptions } from '@tanstack/react-table'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { useDataSelect } from './DataSelect'
import { ErrorToast } from './errors'
import {
  Resource as ResourceT,
  ResourceList as ResourceListT,
  ResourceListItemsKey,
  toKind,
} from './updatedtypes.ts'

import {
  DEFAULT_DATA_SELECT,
  usePageInfo,
  useSortedTableOptions,
} from './utils'

interface ResourceListProps<TResourceList> {
  columns: Array<object>
  initialSort?: SortingState
  queryHook: (
    variables: any,
    options?: Partial<UseQueryOptions<TResourceList>>
  ) => UseQueryResult<TResourceList, unknown>
  itemsKey: ResourceListItemsKey<TResourceList>
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
  queryHook,
  namespaced = false,
  customResource = false,
  itemsKey,
  disableOnRowClick,
  maxHeight,
  tableOptions,
}: ResourceListProps<TResourceList>): ReactElement<any> {
  const navigate = useNavigate()
  const cluster = useCluster()
  const { setNamespaced, namespace, filter } = useDataSelect()
  const { sortBy, reactTableOptions } = useSortedTableOptions(initialSort, {
    meta: { cluster, ...tableOptions },
  })

  const [page, setPage] = useState(0)

  const { data, isFetching } = queryHook(
    {
      filterBy: `name,${filter}`,
      sortBy,
      ...(namespaced ? { namespace } : {}),
      ...DEFAULT_DATA_SELECT,
      page: String(page + 1),
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const resourceList = data as TResourceList
  const items = useMemo(
    () => (resourceList?.[itemsKey] as Array<TResource>) ?? [],
    [itemsKey, resourceList]
  )
  const { hasNextPage } = usePageInfo(items, resourceList?.listMeta)

  useEffect(() => {
    // Reset page when filters change
    setPage(0)
  }, [filter, sortBy, namespace])

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    setPage((p) => p + 1)
  }, [hasNextPage])

  useEffect(() => {
    setNamespaced(namespaced)
  }, [namespaced, setNamespaced])

  return (
    <>
      <ErrorToast errors={resourceList?.errors as any} />
      <Table
        fullHeightWrap
        data={items}
        columns={columns}
        loading={isFetching && page === 0 && items.length === 0}
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
