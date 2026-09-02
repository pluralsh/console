import {
  EmptyState,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import { useParams } from 'react-router-dom'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import {
  useClusterBackupsQuery,
  useClusterBasicQuery,
} from '../../../../generated/graphql'
import { GqlError } from '../../../utils/Alert'
import { BACKUPS_CLUSTERS_BASE_CRUMBS } from '../../clusters/Clusters'

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

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useClusterBackupsQuery, keyPath: ['clusterBackups'] },
    { clusterId }
  )

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
        <Table
          fullHeightWrap
          loose
          columns={columns}
          reactTableOptions={{ meta: { refetch, cluster } }}
          data={data?.clusterBackups?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
        />
      ) : (
        <EmptyState message="Looks like this cluster doesn't have any backups yet." />
      )}
    </div>
  )
}
