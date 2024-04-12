import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { filesize } from 'filesize'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Node_NodeList as NodeListT,
  Node_Node as NodeT,
  NodesQuery,
  NodesQueryVariables,
  useNodesQuery,
} from '../../../generated/graphql-kubernetes'
import {
  ResourceReadyChip,
  getBaseBreadcrumbs,
  useDefaultColumns,
} from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { UsageBar } from '../../cluster/nodes/UsageBar'
import { Usage } from '../../cluster/TableElements'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  NODES_REL_PATH,
  getClusterAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'cluster',
    url: getClusterAbsPath(cluster?.id),
  },
  {
    label: 'nodes',
    url: `${getClusterAbsPath(cluster?.id)}/${NODES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NodeT>()

const colReady = columnHelper.accessor((node) => node?.ready, {
  id: 'ready',
  header: 'Ready',
  cell: ({ getValue }) => <ResourceReadyChip ready={getValue()} />,
})

const colCpu = columnHelper.accessor((node) => node?.allocatedResources, {
  id: 'cpu',
  header: 'CPU',
  cell: ({ getValue }) => {
    const allocatedResources = getValue()

    return (
      <>
        <Usage
          used={allocatedResources.cpuRequests / 1000}
          total={allocatedResources.cpuCapacity / 1000}
        />
        <UsageBar
          usage={allocatedResources.cpuRequestsFraction / 100}
          width={120}
        />
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
        <Usage
          used={filesize(allocatedResources.memoryRequests)}
          total={filesize(allocatedResources.memoryCapacity)}
        />
        <UsageBar
          usage={allocatedResources.memoryRequestsFraction / 100}
          width={120}
        />
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
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

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
