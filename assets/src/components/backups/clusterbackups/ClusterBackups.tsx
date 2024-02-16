import {
  EmptyState,
  HistoryIcon,
  IconFrame,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
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
import { ResponsivePageFullWidth } from '../../utils/layout/ResponsivePageFullWidth'

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
  columnHelper.accessor(({ node }) => node, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const backup = getValue()

      return (
        <IconFrame
          clickable
          icon={<HistoryIcon />}
          textValue="Restore backup"
          tooltip
          type="secondary"
          // TODO: Restore.
        />
      )
    },
  }),
]

export default function ClusterBackups() {
  const theme = useTheme()
  const { clusterId = '' } = useParams()

  const { data, error, loading, refetch } = useClusterBackupsQuery({
    variables: { clusterId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  }) // TODO: Pagination.

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...BACKUPS_BACKUPS_BASE_CRUMBS,
        {
          label: clusterId, // TODO: Cluster name.
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
    </ResponsivePageFullWidth>
  )
}
