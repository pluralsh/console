import { Table } from '@pluralsh/design-system'
import {
  ColCluster,
  ColProvider,
  ColStatus,
  ColVersion,
  columnHelper,
} from 'components/cd/clusters/ClustersColumns'
import { TableCaretLink } from 'components/cluster/TableElements'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'
import { ComponentProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts'

import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData'

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
      fillLevel={1}
      data={data}
      columns={clusterOverviewColumns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      reactTableOptions={reactTableOptions}
      onRowClick={(_e, { original }) =>
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
    gridTemplate: 'minmax(auto, 80px)',
  },
  cell: ({ row: { original } }) => (
    <TableCaretLink
      css={{ alignSelf: 'end' }}
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
