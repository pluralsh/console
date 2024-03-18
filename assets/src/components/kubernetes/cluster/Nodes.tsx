import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { filesize } from 'filesize'

import {
  Node_NodeList as NodeListT,
  Node_Node as NodeT,
  NodesQuery,
  NodesQueryVariables,
  useNodesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

import { UsageBar } from '../../cluster/nodes/UsageBar'

import { Usage, UsageText } from '../../cluster/TableElements'

import { NodeReadyChip } from './utils'

const columnHelper = createColumnHelper<NodeT>()

const colReady = columnHelper.accessor((node) => node?.ready, {
  id: 'ready',
  header: 'Ready',
  cell: ({ getValue }) => <NodeReadyChip ready={getValue()} />,
})

const colCpu = columnHelper.accessor((node) => node?.allocatedResources, {
  id: 'cpu',
  header: 'CPU',
  cell: ({ getValue }) => {
    const allocatedResources = getValue()

    return (
      <>
        <UsageText>
          Requests: {allocatedResources.cpuRequests / 1000} (
          {Math.round(allocatedResources.cpuRequestsFraction)}%)
        </UsageText>
        <UsageText>
          Limits: {allocatedResources.cpuLimits / 1000} (
          {Math.round(allocatedResources.cpuLimitsFraction)}%)
        </UsageText>
        <UsageText>Capacity: {allocatedResources.cpuCapacity / 1000}</UsageText>
      </>
    )
  },
})

const colMemory = columnHelper.accessor((node) => node?.allocatedResources, {
  id: 'memory',
  header: 'Memory',
  cell: ({ getValue }) => {
    const allocatedResources = getValue()

    return (
      <>
        <UsageText>
          Requests: {filesize(allocatedResources.memoryRequests)} (
          {Math.round(allocatedResources.memoryRequestsFraction)}%)
        </UsageText>
        <UsageText>
          Limits: {filesize(allocatedResources.memoryLimits)} (
          {Math.round(allocatedResources.memoryLimitsFraction)}%)
        </UsageText>
        <UsageText>
          Capacity: {filesize(allocatedResources.memoryCapacity)}
        </UsageText>
      </>
    )
  },
})

const colPods = columnHelper.accessor((node) => node?.allocatedResources, {
  id: 'pods',
  header: 'Pods',
  cell: ({ getValue }) => {
    const allocatedResources = getValue()

    return (
      <>
        <Usage
          used={allocatedResources.allocatedPods}
          total={allocatedResources.podCapacity}
        />
        <UsageBar
          usage={allocatedResources.podFraction / 100}
          width={120}
        />
      </>
    )
  },
})

export default function Nodes() {
  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colReady,
      colCpu,
      colMemory,
      colPods,
      colLabels,
      colCreationTimestamp,
    ],
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
