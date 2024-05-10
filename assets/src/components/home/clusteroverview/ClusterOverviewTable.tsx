import { Table } from '@pluralsh/design-system'
import { ClustersRowFragment } from 'generated/graphql'
import { ComponentProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { Row } from '@tanstack/react-table'
import {
  ColCluster,
  ColProvider,
  ColStatus,
  ColVersion,
  columnHelper,
} from 'components/cd/clusters/ClustersColumns'
import { TableCaretLink } from 'components/cluster/TableElements'
import { CLUSTERS_REACT_VIRTUAL_OPTIONS } from 'components/cd/clusters/Clusters'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'

export function ClusterOverViewTable({
  refetch,
  data,
  ...props
}: {
  refetch?
  data
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  const navigate = useNavigate()
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  if (!data) {
    return <TableSkeleton centered />
  }

  return (
    <Table
      loose
      data={data}
      columns={clusterOverviewColumns}
      reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
      reactTableOptions={reactTableOptions}
      onRowClick={(_e, { original }: Row<Edge<ClustersRowFragment>>) =>
        navigate(
          getClusterDetailsPath({
            clusterId: original.node?.id,
          })
        )
      }
      {...props}
    />
  )
}

export const ColActions = columnHelper.display({
  id: 'actions',
  meta: {
    gridTemplate: 'minmax(25px, 50px)',
  },
  cell: ({ row: { original } }) => (
    <TableCaretLink
      style={{ alignSelf: 'end' }}
      to={getClusterDetailsPath({
        clusterId: original?.node?.id,
      })}
      textValue={`View ${original?.node?.name} details`}
    />
  ),
})

const clusterOverviewColumns = [
  ColCluster,
  ColProvider,
  ColVersion,
  ColStatus,
  ColActions,
]
