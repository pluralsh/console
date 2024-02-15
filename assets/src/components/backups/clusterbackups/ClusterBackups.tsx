import { EmptyState, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ComponentProps, useMemo, useState } from 'react'
import { TableState, createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useParams } from 'react-router-dom'

import {
  ClusterBackup,
  useClusterBackupsQuery,
} from '../../../generated/graphql'
import { GqlError } from '../../utils/Alert'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

import { Edge } from '../../../utils/graphql'
import { BACKUPS_BACKUPS_BASE_CRUMBS } from '../backups/Backups'
import { DateTimeCol } from '../../utils/table/DateTimeCol'

const POLL_INTERVAL = 10 * 1000

const columnHelper = createColumnHelper<Edge<ClusterBackup>>()

const columns = [
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
]

export default function ClusterBackups() {
  const theme = useTheme()
  const { clusterId = '' } = useParams()

  const { data, error, loading, refetch } = useClusterBackupsQuery({
    variables: { clusterId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...BACKUPS_BACKUPS_BASE_CRUMBS,
        {
          label: clusterId,
          url: `/backups/backups/${clusterId}`,
        },
      ],
      [clusterId]
    )
  )
  const [tableFilters, _] = useState<
    Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  >({
    globalFilter: '',
  })

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        state: {
          ...tableFilters,
        },
        meta: { refetch },
      }),
      [tableFilters, refetch]
    )

  if (error) {
    return (
      <GqlError
        header="Something went wrong"
        error={error}
      />
    )
  }

  if (loading) {
    return <LoadingIndicator />
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
            data={data?.clusterBackups?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            reactTableOptions={reactTableOptions}
            loose
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like this cluster doesn't have any backups yet." />
      )}
    </div>
  )
}
