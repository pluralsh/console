import {
  Dispatch,
  JSX,
  type MouseEvent,
  ReactElement,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import type { OperationVariables } from '@apollo/client/core'
import type {
  QueryHookOptions,
  QueryResult,
} from '@apollo/client/react/types/types'
import { Row } from '@tanstack/react-table'
import { Table } from '@pluralsh/design-system'

import styled from 'styled-components'

import { KubernetesClient } from '../../helpers/kubernetes.client'
import { Types_ListMeta as ListMetaT } from '../../generated/graphql-kubernetes'
import { FullHeightTableWrap } from '../utils/layout/FullHeightTableWrap'

import {
  DEFAULT_DATA_SELECT,
  ITEMS_PER_PAGE,
  extendConnection,
  usePageInfo,
  useSortedTableOptions,
} from './utils'
import { useKubernetesContext } from './Kubernetes'

export type ResourceListContextT = {
  setNamespaced: Dispatch<SetStateAction<boolean>>
}

export const ResourceListContext = createContext<
  ResourceListContextT | undefined
>(undefined)

// TODO: Remove after refactor
export default function ResourceListProxy({
  children,
  namespaced = false,
}: {
  children: JSX.Element
  namespaced?: boolean
}): JSX.Element {
  return children
}

interface DataSelectVariables extends OperationVariables {
  filterBy?: Nullable<string>
  sortBy?: Nullable<string>
  itemsPerPage?: Nullable<string>
  page?: Nullable<string>
}

interface ResourceVariables extends DataSelectVariables {
  namespace?: Nullable<string>
}

interface ResourceListT {
  listMeta: ListMetaT
}

type QueryName<TQuery> = Exclude<Extract<keyof TQuery, string>, '__typename'>
type ResourceListItemsKey<TResourceList> = Exclude<
  Extract<keyof TResourceList, string>,
  '__typename' | 'listMeta' | 'errors' | 'status' | 'cumulativeMetrics'
>

interface ResourceListProps<
  TResourceList,
  TResource,
  TQuery,
  TVariables extends ResourceVariables,
> {
  columns: Array<object>
  query: (
    baseOptions: QueryHookOptions<TQuery, TVariables>
  ) => QueryResult<TQuery, TVariables>
  queryName: QueryName<TQuery>
  itemsKey: ResourceListItemsKey<TResourceList>
  namespaced?: boolean
  onRowClick?: (e: MouseEvent<HTMLTableRowElement>, row: Row<TResource>) => void
}

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

// TODO: Use default export
export function ResourceList<
  TResourceList extends ResourceListT,
  TResource,
  TQuery,
  TVariables extends ResourceVariables,
>({
  columns,
  query,
  namespaced = false,
  queryName,
  itemsKey,
  onRowClick,
}: ResourceListProps<
  TResourceList,
  TResource,
  TQuery,
  TVariables
>): ReactElement {
  const { cluster, namespace, filter } = useKubernetesContext()
  const { sortBy, reactTableOptions } = useSortedTableOptions()
  const ctx = useContext(ResourceListContext)

  if (!ctx) {
    throw Error('ResourceList must be used within a ResourceListContext')
  }

  ctx.setNamespaced(namespaced)

  const { data, loading, fetchMore } = query({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      ...(namespaced ? { namespace } : {}),
      ...DEFAULT_DATA_SELECT,
      filterBy: `name,${filter}`,
      sortBy,
    } as TVariables,
  })

  const resourceList = data?.[queryName] as TResourceList
  const items = useMemo(
    () =>
      loading
        ? Array(ITEMS_PER_PAGE - 1).fill({})
        : (resourceList?.[itemsKey] as Array<TResource>) ?? [],
    [itemsKey, loading, resourceList]
  )
  const { page, hasNextPage } = usePageInfo(items, resourceList?.listMeta)

  const columnsData = useMemo(
    () =>
      loading
        ? columns.map((col) => ({
            ...col,
            cell: <Skeleton />,
          }))
        : columns,
    [columns, loading]
  )

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult, queryName, itemsKey),
    })
  }, [fetchMore, hasNextPage, page, queryName, itemsKey])

  return (
    <FullHeightTableWrap>
      <Table
        data={items}
        columns={columnsData}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        virtualizeRows
        onRowClick={onRowClick}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
