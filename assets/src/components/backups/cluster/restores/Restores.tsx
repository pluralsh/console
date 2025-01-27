import {
  Chip,
  EmptyState,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ComponentProps, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useParams } from 'react-router-dom'
import { capitalize } from 'lodash'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import {
  ClusterBasicFragment,
  ClusterRestore,
  RestoreStatus,
  useClusterBasicQuery,
  useClusterRestoresQuery,
} from '../../../../generated/graphql'
import { GqlError } from '../../../utils/Alert'
import { Edge } from '../../../../utils/graphql'
import { BACKUPS_CLUSTERS_BASE_CRUMBS } from '../../clusters/Clusters'
import { DynamicClusterIcon } from '../../../cd/clusters/DynamicClusterIcon'
import { ColClusterContentSC } from '../../../cd/clusters/ClustersColumns'
import { BasicLink } from '../../../utils/typography/BasicLink'
import { StackedText } from '../../../utils/table/StackedText'

import {
  CLUSTER_RESTORES_REL_PATH,
  getBackupsClusterAbsPath,
} from '../../../../routes/backupRoutesConsts'
import { DateTimeCol } from '../../../utils/table/DateTimeCol'

const restoreStatusSeverity = {
  [RestoreStatus.Created]: 'info',
  [RestoreStatus.Pending]: 'info',
  [RestoreStatus.Failed]: 'danger',
  [RestoreStatus.Successful]: 'success',
} as const satisfies Record<
  RestoreStatus,
  ComponentProps<typeof Chip>['severity']
>

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

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useClusterRestoresQuery, keyPath: ['clusterRestores'] },
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
        <Table
          fullHeightWrap
          loose
          columns={columns}
          reactTableOptions={{ meta: { refetch, cluster } }}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          data={data?.clusterRestores?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
        />
      ) : (
        <EmptyState message="Looks like this cluster doesn't have any restores yet." />
      )}
    </div>
  )
}
