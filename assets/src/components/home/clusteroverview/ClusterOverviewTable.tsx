import { Flex, Table } from '@pluralsh/design-system'
import {
  ColCluster,
  ColProvider,
  ColStatus,
  ColVersion,
  columnHelper,
} from 'components/cd/clusters/ClustersColumns'
import { TableCaretLink } from 'components/cluster/TableElements'
import { ComponentProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts'

import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'

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

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  meta: { gridTemplate: 'max(92px)' },
  cell: function Cell({ getValue }) {
    const cluster = getValue()
    return (
      <Flex gap="xxsmall">
        <AiInsightSummaryIcon
          preserveSpace
          navPath={`${getClusterDetailsPath({
            clusterId: cluster?.id,
          })}/insights`}
          insight={getValue()?.insight}
        />
        <TableCaretLink
          to={getClusterDetailsPath({
            clusterId: cluster?.id,
          })}
          textValue={`View ${cluster?.name} details`}
        />
      </Flex>
    )
  },
})

const clusterOverviewColumns = [
  ColCluster,
  ColProvider,
  ColVersion,
  ColStatus,
  ColActions,
]
