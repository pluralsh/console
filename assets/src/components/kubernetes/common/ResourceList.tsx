import { ReactElement, useCallback, useEffect, useMemo } from 'react'
import type {
  QueryHookOptions,
  QueryResult,
} from '@apollo/client/react/types/types'
import { Table } from '@pluralsh/design-system'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { Row, SortingState, TableOptions } from '@tanstack/react-table'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { useDataSelect } from './DataSelect'
import {
  QueryName,
  ResourceListItemsKey,
  ResourceList as ResourceListT,
  Resource as ResourceT,
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

const SKELETON_ITEMS = 10

const Skeleton = styled(SkeletonUnstyled)(({ theme }) => ({
  '@keyframes moving-gradient': {
    '0%': { backgroundPosition: '-250px 0' },
    '100%': { backgroundPosition: '250px 0' },
  },

  maxWidth: '400px',
  width: '100%',

  span: {
    borderRadius: theme.borderRadiuses.medium,
    maxWidth: '400px',
    width: 'unset',
    minWidth: '150px',
    display: 'block',
    height: '12px',
    background: `linear-gradient(to right, ${theme.colors.border} 20%, ${theme.colors['border-fill-two']} 50%, ${theme.colors.border} 80%)`,
    backgroundSize: '500px 100px',
    animation: 'moving-gradient 2s infinite linear forwards',
  },
}))

function SkeletonUnstyled({ ...props }): ReactElement {
  return (
    <div {...props}>
      <span />
    </div>
  )
}

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
}: ResourceListProps<TResourceList, TQuery, TVariables>): ReactElement {
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
    () =>
      isLoading
        ? Array(SKELETON_ITEMS).fill({})
        : ((resourceList?.[itemsKey] as Array<TResource>) ?? []),
    [isLoading, itemsKey, resourceList]
  )
  const { page, hasNextPage } = usePageInfo(items, resourceList?.listMeta)

  const columnsData = useMemo(
    () =>
      isLoading
        ? columns.map((col) => ({
            ...col,
            cell: <Skeleton />,
          }))
        : columns,
    [isLoading, columns]
  )

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult, queryName, itemsKey),
    })
  }, [fetchMore, hasNextPage, page, queryName, itemsKey])

  useEffect(() => {
    setNamespaced(namespaced)
  }, [setNamespaced, namespaced])

  return (
    <>
      <ErrorToast errors={resourceList?.errors} />
      <FullHeightTableWrap>
        <Table
          data={items}
          columns={columnsData}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          reactTableOptions={{
            ...reactTableOptions,
            ...{ meta: { ...reactTableOptions.meta, refetch } },
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
      </FullHeightTableWrap>
    </>
  )
}
