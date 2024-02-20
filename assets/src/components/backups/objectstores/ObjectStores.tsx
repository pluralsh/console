import { ComponentProps, useCallback, useMemo, useState } from 'react'
import {
  Breadcrumb,
  EmptyState,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import isEmpty from 'lodash/isEmpty'

import { useTheme } from 'styled-components'

import { createColumnHelper } from '@tanstack/react-table'

import { VirtualItem } from '@tanstack/react-virtual'

import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import {
  BACKUPS_ABS_PATH,
  OBJECT_STORES_REL_PATH,
} from '../../../routes/backupRoutesConsts'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import { ObjectStore, useObjectStoresQuery } from '../../../generated/graphql'
import { Edge, extendConnection } from '../../../utils/graphql'
import { ColWithIcon } from '../../utils/table/ColWithIcon'

import { GqlError } from '../../utils/Alert'

import { useSlicePolling } from '../../utils/tableFetchHelpers'

import CreateObjectStore from './CreateObjectStore'
import {
  ObjectStoreCloudIcon,
  getObjectStoreCloud,
  objectStoreCloudToDisplayName,
} from './utils'
import { DeleteObjectStore } from './DeleteObjectStore'
import UpdateObjectStore from './UpdateObjectStore'

const POLL_INTERVAL = 10 * 1000

const QUERY_PAGE_SIZE = 100

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const BACKUPS_OBJECT_STORES_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'backups', url: BACKUPS_ABS_PATH },
  {
    label: 'object stores',
    url: `${BACKUPS_ABS_PATH}/${OBJECT_STORES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<Edge<ObjectStore>>()

export const columns = [
  columnHelper.accessor(({ node }) => node, {
    id: 'provider',
    header: 'Provider',
    meta: { gridTemplate: `240px` },
    cell: ({ getValue }) => {
      const cloud = getObjectStoreCloud(getValue())

      if (!cloud) return null

      return (
        <ColWithIcon
          truncateLeft
          icon={<ObjectStoreCloudIcon cloud={cloud} />}
        >
          {objectStoreCloudToDisplayName[cloud]}
        </ColWithIcon>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    header: 'Storage name',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: ({
      table,
      row: {
        original: { node },
      },
    }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const { refetch } = table.options.meta as { refetch?: () => void }

      return (
        node && (
          <div
            css={{
              display: 'flex',
              flexGrow: 0,
              gap: theme.spacing.medium,
              alignItems: 'center',
              alignSelf: 'end',
            }}
          >
            <UpdateObjectStore
              objectStore={node}
              refetch={refetch}
            />
            <DeleteObjectStore
              objectStore={node}
              refetch={refetch}
            />
          </div>
        )
      )
    },
  }),
]

export default function ObjectStores() {
  const theme = useTheme()
  const [virtualSlice, _setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  const queryResult = useObjectStoresQuery({
    variables: {
      first: QUERY_PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData
  const objectStores = data?.objectStores
  const pageInfo = objectStores?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: QUERY_PAGE_SIZE,
    key: 'objectStores',
    interval: POLL_INTERVAL,
  })
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult.objectStores, 'objectStores'),
    })
  }, [fetchMore, pageInfo?.endCursor])

  const headerActions = useMemo(
    () => <CreateObjectStore refetch={refetch} />,
    [refetch]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(BACKUPS_OBJECT_STORES_BASE_CRUMBS)

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      {!isEmpty(objectStores?.edges) ? (
        <FullHeightTableWrap>
          <Table
            loose
            columns={columns}
            reactTableOptions={{ meta: { refetch } }}
            reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
            data={objectStores?.edges || []}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any object storage connections yet." />
      )}
    </div>
  )
}
