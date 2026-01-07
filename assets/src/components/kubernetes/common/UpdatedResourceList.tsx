import { Table } from '@pluralsh/design-system'
import { UseQueryResult } from '@tanstack/react-query'
import { Row, SortingState, TableOptions } from '@tanstack/react-table'
import uniqWith from 'lodash/uniqWith'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
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
  Resource as ResourceT,
  ResourceList as ResourceListT,
  ResourceListItemsKey,
  toKind,
} from './types'

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
    options?: any
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
  const [dataCombined, setDataCombined] = useState<TResource[]>([])

  const { data, isFetching } = queryHook(
    {
      filterBy: `name,${filter}`,
      sortBy,
      ...(namespaced ? { namespace } : {}),
      ...DEFAULT_DATA_SELECT,
      page: String(page + 1),
    },
    {
      pollInterval: 30_000,
      client: KubernetesClient(cluster?.id ?? ''),
    }
  )

  const resourceList = data as TResourceList
  const items = useMemo(
    () => (resourceList?.[itemsKey] as Array<TResource>) ?? [],
    [itemsKey, resourceList]
  )
  const { hasNextPage } = usePageInfo(items, resourceList?.listMeta)

  useEffect(() => {
    if (page === 0) {
      setDataCombined(items)
    } else {
      setDataCombined((prev) =>
        uniqWith(
          [...prev, ...items],
          (a, b) => a.objectMeta.name === b.objectMeta.name
        )
      )
    }
  }, [items, page])

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
      <ErrorToast errors={resourceList?.errors} />
      <Table
        fullHeightWrap
        data={dataCombined}
        columns={columns}
        loading={isFetching && page === 0 && dataCombined.length === 0}
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
