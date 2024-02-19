import {
  Chip,
  EmptyState,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ComponentProps, useCallback, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useParams } from 'react-router-dom'

import { VirtualItem } from '@tanstack/react-virtual'

import {
  ClusterBackup,
  ClusterBasicFragment,
  useClusterBackupsQuery,
  useClusterBasicQuery,
} from '../../../generated/graphql'
import { GqlError } from '../../utils/Alert'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

import { Edge, extendConnection } from '../../../utils/graphql'
import { BACKUPS_BACKUPS_BASE_CRUMBS } from '../backups/Backups'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { ResponsivePageFullWidth } from '../../utils/layout/ResponsivePageFullWidth'

import { DynamicClusterIcon } from '../../cd/clusters/DynamicClusterIcon'
import { ColClusterContentSC } from '../../cd/clusters/ClustersColumns'

import { BasicLink } from '../../utils/typography/BasicLink'
import { StackedText } from '../../utils/table/StackedText'

import { useSlicePolling } from '../../utils/tableFetchHelpers'

import { RestoreClusterBackup } from './RestoreClusterBackup'

const POLL_INTERVAL = 10 * 1000
const QUERY_PAGE_SIZE = 100

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const columnHelper = createColumnHelper<Edge<ClusterBackup>>()

const columns = [
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ table }) => {
      const { cluster } = table.options.meta as {
        cluster?: ClusterBasicFragment
      }

      return (
        <ColClusterContentSC>
          <DynamicClusterIcon
            deleting={!!cluster?.deletedAt}
            protect={!!cluster?.protect}
            self={!!cluster?.self}
          />
          <StackedText
            first={
              <BasicLink css={{ whiteSpace: 'nowrap' }}>
                {cluster?.name}
              </BasicLink>
            }
            second={`handle: ${cluster?.handle}`}
          />
        </ColClusterContentSC>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'id',
    header: 'Backup ID',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.insertedAt, {
    id: 'date',
    header: 'Backup date',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.garbageCollected, {
    id: 'status',
    header: 'Status',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) =>
      getValue() ? (
        <Chip severity="danger">Garbage collected</Chip>
      ) : (
        <Chip severity="success">Ready</Chip>
      ),
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const backup = getValue()

      return <RestoreClusterBackup backup={backup} />
    },
  }),
]

export default function ClusterBackups() {
  const theme = useTheme()
  const { clusterId = '' } = useParams()

  const {
    data: clusterData,
    error: clusterError,
    loading: clusterLoading,
  } = useClusterBasicQuery({
    variables: { id: clusterId },
    fetchPolicy: 'cache-and-network',
  })
  const cluster = clusterData?.cluster

  const [virtualSlice, _setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()
  const queryResult = useClusterBackupsQuery({
    variables: { clusterId, first: QUERY_PAGE_SIZE },
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
  const clusterBackups = data?.clusterBackups
  const pageInfo = clusterBackups?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: QUERY_PAGE_SIZE,
    key: 'clusterBackups',
    interval: POLL_INTERVAL,
  })
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.clusterBackups,
          'clusterBackups'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...BACKUPS_BACKUPS_BASE_CRUMBS,
        {
          label: cluster?.name ?? clusterId,
          url: `/backups/backups/${clusterId}`,
        },
      ],
      [cluster, clusterId]
    )
  )

  if (clusterError || error) {
    return <GqlError error={error} />
  }

  if (clusterLoading || !data) {
    return <LoopingLogo />
  }

  return (
    <ResponsivePageFullWidth
      heading="Backups"
      scrollable={false}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
          height: '100%',
        }}
      >
        {!isEmpty(data?.clusterBackups?.edges) ? (
          <FullHeightTableWrap>
            <Table
              loose
              columns={columns}
              reactTableOptions={{ meta: { refetch, cluster } }}
              reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
              data={data?.clusterBackups?.edges || []}
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
          <EmptyState message="Looks like this cluster doesn't have any backups yet." />
        )}
      </div>
    </ResponsivePageFullWidth>
  )
}
