import { useOutletContext } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'

import { Cluster } from '../../../generated/graphql'
import {
  ColCpuTotal,
  ColCpuUsage,
  ColMemoryTotal,
  ColMemoryUsage,
  ColName,
  ColRegion,
  ColStatus,
  ColZone,
  NodesList,
  TableData,
  columnHelper,
} from '../../cluster/nodes/NodesList'
import { TableCaretLink } from '../../cluster/TableElements'

export const ColActions = columnHelper.accessor(() => null, {
  id: 'actions',
  cell: ({ row: { original } }) => (
    <TableCaretLink
      to="/" // TODO
      textValue={`View node ${original?.name}`}
    />
  ),
  header: '',
})

export default function ClusterNodes() {
  const { cluster } = useOutletContext() as { cluster: Cluster }
  const columns: ColumnDef<TableData, any>[] = useMemo(
    () => [
      ColName,
      ColRegion,
      ColZone,
      ColCpuUsage,
      ColMemoryUsage,
      ColCpuTotal,
      ColMemoryTotal,
      ColStatus,
      ColActions,
    ],
    []
  )

  return (
    // TODO: Replace row link.
    <NodesList
      nodes={cluster?.nodes || []}
      nodeMetrics={cluster?.nodeMetrics || []}
      columns={columns}
    />
  )
}
