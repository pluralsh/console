import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Node_NodeList as NodeListT,
  Node_Node as NodeT,
  NodesQuery,
  NodesQueryVariables,
  useNodesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<NodeT>()

export default function Nodes() {
  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colLabels, colCreationTimestamp],
    [colName, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<NodeListT, NodeT, NodesQuery, NodesQueryVariables>
      columns={columns}
      query={useNodesQuery}
      queryName="handleGetNodeList"
      itemsKey="nodes"
    />
  )
}
