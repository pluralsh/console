import {
  IconFrame,
  SortDescIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { filesize } from 'filesize'
import { useMemo, useState } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import { Maybe } from '../../../generated/graphql-kubernetes'
import {
  getClusterAbsPath,
  NODES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { Usage } from '../../cluster/TableElements'
import { UsageBar } from '../../utils/UsageBar.tsx'
import { useCluster } from '../Cluster'
import { DrainNodeModal } from '../common/DrainNodeModal.tsx'
import { ResourceReadyChip, useDefaultColumns } from '../common/utils'

import { getClusterBreadcrumbs } from './Cluster'
import { UpdatedResourceList } from '../common/UpdatedResourceList.tsx'
import { NodeNode, NodeNodeList } from '../../../generated/kubernetes'
import { getNodesInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getClusterBreadcrumbs(cluster),
  {
    label: 'nodes',
    url: `${getClusterAbsPath(cluster?.id)}/${NODES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NodeNode>()

const colReady = columnHelper.accessor((node) => node?.ready, {
  id: 'ready',
  header: 'Ready',
  cell: ({ getValue }) => <ResourceReadyChip ready={getValue()} />,
})

const colKubelet = columnHelper.accessor(
  (node) => node?.nodeInfo.kubeletVersion,
  {
    id: 'kubelet',
    header: 'kubelet',
    cell: ({ getValue }) => getValue(),
  }
)

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

const colActions = columnHelper.accessor(() => null, {
  id: 'actions',
  header: '',
  cell: function Cell({ row: { original } }) {
    const [open, setOpen] = useState(false)

    return (
      <>
        <IconFrame
          clickable
          icon={<SortDescIcon color="icon-danger" />}
          tooltip="Drain node"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        />
        <DrainNodeModal
          name={original.objectMeta.name ?? ''}
          open={open}
          setOpen={setOpen}
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
      colKubelet,
      colCpu,
      colMemory,
      colPods,
      colLabels,
      colCreationTimestamp,
      colActions,
    ],
    [colName, colLabels, colCreationTimestamp]
  )

  return (
    <UpdatedResourceList<NodeNodeList, NodeNode>
      columns={columns}
      queryOptions={getNodesInfiniteOptions}
      itemsKey="nodes"
    />
  )
}
