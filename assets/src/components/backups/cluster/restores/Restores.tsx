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
import { capitalize } from 'lodash'

import {
  ClusterBasicFragment,
  ClusterRestore,
  RestoreStatus,
  useClusterBasicQuery,
  useClusterRestoresQuery,
} from '../../../../generated/graphql'
import { GqlError } from '../../../utils/Alert'
import { FullHeightTableWrap } from '../../../utils/layout/FullHeightTableWrap'
import { Edge, extendConnection } from '../../../../utils/graphql'
import { BACKUPS_CLUSTERS_BASE_CRUMBS } from '../../clusters/Clusters'
import { DynamicClusterIcon } from '../../../cd/clusters/DynamicClusterIcon'
import { ColClusterContentSC } from '../../../cd/clusters/ClustersColumns'
import { BasicLink } from '../../../utils/typography/BasicLink'
import { StackedText } from '../../../utils/table/StackedText'
import { useSlicePolling } from '../../../utils/tableFetchHelpers'

import {
  CLUSTER_RESTORES_REL_PATH,
  getBackupsClusterAbsPath,
} from '../../../../routes/backupRoutesConsts'
import { DateTimeCol } from '../../../utils/table/DateTimeCol'

const POLL_INTERVAL = 10 * 1000
const QUERY_PAGE_SIZE = 100

const restoreStatusSeverity = {
  [RestoreStatus.Created]: 'info',
  [RestoreStatus.Pending]: 'info',
  [RestoreStatus.Failed]: 'danger',
  [RestoreStatus.Successful]: 'success',
} as const satisfies Record<
  RestoreStatus,
  ComponentProps<typeof Chip>['severity']
>

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const columnHelper = createColumnHelper<Edge<ClusterRestore>>()

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
  columnHelper.accessor(({ node }) => node?.backup?.id, {
    id: 'backupId',
    header: 'Backup ID',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.backup?.insertedAt, {
    id: 'backupDate',
    header: 'Backup date',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'restoreId',
    header: 'Restore ID',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.insertedAt, {
    id: 'restoreDate',
    header: 'Restore date',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.status, {
    id: 'status',
    header: 'Restore status',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => {
      const status = getValue() ?? 'Unknown'

      return (
        <Chip severity={restoreStatusSeverity[status]}>
          {capitalize(status)}
        </Chip>
      )
    },
  }),
]

export default function Restores() {
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
  const queryResult = useClusterRestoresQuery({
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
  const clusterRestores = data?.clusterRestores
  const pageInfo = clusterRestores?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: QUERY_PAGE_SIZE,
    key: 'clusterRestores',
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
          fetchMoreResult.clusterRestores,
          'clusterRestores'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...BACKUPS_CLUSTERS_BASE_CRUMBS,
        {
          label: cluster?.name ?? clusterId,
          url: getBackupsClusterAbsPath(clusterId),
        },
        {
          label: 'restores',
          url: `${getBackupsClusterAbsPath(
            clusterId
          )}/${CLUSTER_RESTORES_REL_PATH}`,
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
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      {!isEmpty(data?.clusterRestores?.edges) ? (
        <FullHeightTableWrap>
          <Table
            loose
            columns={columns}
            reactTableOptions={{ meta: { refetch, cluster } }}
            reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
            data={data?.clusterRestores?.edges || []}
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
        <EmptyState message="Looks like this cluster doesn't have any restores yet." />
      )}
    </div>
  )
}
