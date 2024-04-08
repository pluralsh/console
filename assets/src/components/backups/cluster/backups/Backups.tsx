import {
  EmptyState,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ComponentProps, useCallback, useMemo, useState } from 'react'
import isEmpty from 'lodash/isEmpty'
import { useParams } from 'react-router-dom'
import { VirtualItem } from '@tanstack/react-virtual'

import {
  useClusterBackupsQuery,
  useClusterBasicQuery,
} from '../../../../generated/graphql'
import { GqlError } from '../../../utils/Alert'
import { FullHeightTableWrap } from '../../../utils/layout/FullHeightTableWrap'
import { extendConnection } from '../../../../utils/graphql'
import { BACKUPS_CLUSTERS_BASE_CRUMBS } from '../../clusters/Clusters'
import { useSlicePolling } from '../../../utils/tableFetchHelpers'

import {
  CLUSTER_BACKUPS_REL_PATH,
  getBackupsClusterAbsPath,
} from '../../../../routes/backupRoutesConsts'

import {
  ColActions,
  ColBackupDate,
  ColBackupId,
  ColCluster,
  ColStatus,
} from './BackupsColumns'

const POLL_INTERVAL = 10 * 1000
const QUERY_PAGE_SIZE = 100

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const columns = [ColCluster, ColBackupId, ColBackupDate, ColStatus, ColActions]

export default function Backups() {
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
        ...BACKUPS_CLUSTERS_BASE_CRUMBS,
        {
          label: cluster?.name ?? clusterId,
          url: getBackupsClusterAbsPath(clusterId),
        },
        {
          label: 'backups',
          url: `${getBackupsClusterAbsPath(
            clusterId
          )}/${CLUSTER_BACKUPS_REL_PATH}`,
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
  )
}
