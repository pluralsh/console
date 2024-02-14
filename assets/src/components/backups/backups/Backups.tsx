import {
  Breadcrumb,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { ComponentProps, useMemo, useState } from 'react'

import { TableState, createColumnHelper } from '@tanstack/react-table'

import isEmpty from 'lodash/isEmpty'

import {
  BACKUPS_ABS_PATH,
  BACKUPS_REL_PATH,
} from '../../../routes/backupRoutesConsts'
import {
  ClustersObjectStoresFragment,
  useClustersObjectStoresQuery,
} from '../../../generated/graphql'

import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'

import { GqlError } from '../../utils/Alert'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

import { Edge } from '../../../utils/graphql'

import ConfigureClusterBackups from './ConfigureClusterBackups'

const POLL_INTERVAL = 10 * 1000

const BACKUPS_BACKUPS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'backups', url: BACKUPS_ABS_PATH },
  {
    label: 'backups',
    url: `${BACKUPS_ABS_PATH}/${BACKUPS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<Edge<ClustersObjectStoresFragment>>()

const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'cluster',
    header: 'Cluster',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.objectStore?.name, {
    id: 'name',
    header: 'Storage name',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
]

export default function Backups() {
  const theme = useTheme()

  const { data, error, refetch } = useClustersObjectStoresQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  }) // TODO: Pagination.

  const headerActions = useMemo(
    () => <ConfigureClusterBackups refetch={refetch} />,
    [refetch]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(BACKUPS_BACKUPS_BASE_CRUMBS)

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

  if (!data) {
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
      {!isEmpty(data?.clusters?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.clusters?.edges || []}
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
        <EmptyState message="Looks like you don't have any clusters with backups yet." />
      )}
    </div>
  )
}
