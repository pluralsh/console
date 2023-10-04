import { createColumnHelper } from '@tanstack/react-table'
import { ClusterIcon } from '@pluralsh/design-system'
import { ServiceDeploymentsRowFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { useTheme } from 'styled-components'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { ServiceStatusChip } from './ServiceStatusChip'
import { ServicesRollbackDeployment } from './ServicesRollbackDeployment'

const columnHelper = createColumnHelper<Edge<ServiceDeploymentsRowFragment>>()

export const ColServiceDeployment = columnHelper.accessor(
  ({ node }) => node?.name,
  {
    id: 'deployment',
    header: 'Deployment',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }
)

export const ColCluster = columnHelper.accessor(
  ({ node }) => node?.cluster?.name,
  {
    id: 'cluster',
    header: 'Cluster',
    enableSorting: true,
    enableGlobalFilter: true,
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue) =>
      row.original.node?.cluster?.id === filterValue,
    cell: ({ getValue }) => (
      <ColWithIcon icon={<ClusterIcon />}>{getValue()}</ColWithIcon>
    ),
  }
)

export const ColRepo = columnHelper.accessor(
  ({ node }) => node?.repository?.url,
  {
    id: 'repository',
    header: 'Repository',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => (
      <ColWithIcon
        truncateLeft
        icon={<ClusterIcon />}
      >
        {getValue()}
      </ColWithIcon>
    ),
  }
)

function toDateOrUndef(d: unknown) {
  const date = new Date(d as any)

  return Number.isNaN(date.getTime()) ? undefined : date
}

export const ColLastActivity = columnHelper.accessor(
  ({ node }) => {
    const updatedAt = toDateOrUndef(node?.updatedAt)
    const insertedAt = toDateOrUndef(node?.insertedAt)

    return updatedAt || insertedAt || undefined
  },
  {
    id: 'lastActivity',
    header: 'Activity ',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ getValue }) => (
      <DateTimeCol dateString={getValue()?.toISOString()} />
    ),
  }
)

export const ColStatus = columnHelper.accessor(({ node }) => node?.status, {
  id: 'status',
  header: 'Component status',
  enableSorting: true,
  enableColumnFilter: true,
  filterFn: 'equalsString',
  cell: ({
    row: {
      original: { node },
    },
  }) => (
    <ServiceStatusChip
      status={node?.status}
      componentStatus={node?.componentStatus}
    />
  ),
})

export const getColActions = ({ refetch }: { refetch: () => void }) =>
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'actions',
    header: '',
    cell: ({
      row: {
        original: { node },
      },
    }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        node && (
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.large,
              alignItems: 'center',
            }}
          >
            <ServicesRollbackDeployment
              refetch={refetch}
              serviceDeployment={node}
            />
          </div>
        )
      )
    },
  })
