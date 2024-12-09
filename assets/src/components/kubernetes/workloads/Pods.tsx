import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import {
  InfoOutlineIcon,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { filesize } from 'filesize'

import {
  Maybe,
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  PodsQuery,
  PodsQueryVariables,
  usePodsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  PODS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ContainerStatuses } from '../../cluster/ContainerStatuses'
import { Kind } from '../common/types'
import ResourceLink from '../common/ResourceLink'
import { UsageText } from '../../cluster/TableElements'

import { WorkloadImages, toReadiness } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'
import { ContainerStatusT } from '../../cd/cluster/pod/PodsList.tsx'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'pods',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${PODS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<PodT>()

const colImages = columnHelper.accessor((pod) => pod?.containerImages, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => <WorkloadImages images={getValue()} />,
})

const colNode = columnHelper.accessor((pod) => pod?.nodeName, {
  id: 'node',
  header: 'Node',
  cell: ({ getValue }) => (
    <ResourceLink
      objectRef={{
        kind: Kind.Node,
        name: getValue(),
      }}
      onClick={(e) => e.stopPropagation()}
    />
  ),
})

const colRestarts = columnHelper.accessor((pod) => pod?.restartCount, {
  id: 'restarts',
  header: 'Restarts',
  cell: ({ getValue }) => getValue(),
})

const colContainers = columnHelper.accessor(
  (row) => row?.containerStatuses?.length,
  {
    id: 'containers',
    cell: ({ row: { original } }) => (
      <ContainerStatuses
        statuses={
          original?.containerStatuses?.map(
            (c) =>
              ({
                name: c?.name,
                readiness: toReadiness(c!.state),
              }) as ContainerStatusT
          ) ?? []
        }
      />
    ),
    header: 'Containers',
  }
)

const colCpu = columnHelper.accessor((row) => row?.allocatedResources, {
  id: 'cpu',
  cell: ({ getValue }) => {
    const allocatedResources = getValue()

    return (
      <UsageText>
        {allocatedResources?.cpuRequests
          ? allocatedResources.cpuRequests / 1000
          : '-'}
        {' / '}
        {allocatedResources?.cpuLimits
          ? allocatedResources.cpuLimits / 1000
          : '-'}
      </UsageText>
    )
  },
  // @ts-ignore
  header: (
    <div>
      CPU{' '}
      <Tooltip
        label='Allocated CPU displayed in "requests / limits" format. Values are added up from all containers that have them specified by the user. '
        width={370}
      >
        <InfoOutlineIcon size={14} />
      </Tooltip>
    </div>
  ),
})

const colMemory = columnHelper.accessor((row) => row?.allocatedResources, {
  id: 'memory',
  cell: ({ getValue }) => {
    const allocatedResources = getValue()

    return (
      <UsageText>
        {allocatedResources?.memoryRequests
          ? filesize(allocatedResources.memoryRequests)
          : '-'}
        {' / '}
        {allocatedResources?.memoryLimits
          ? filesize(allocatedResources.memoryLimits)
          : '-'}
      </UsageText>
    )
  },
  // @ts-ignore
  header: (
    <div>
      Memory{' '}
      <Tooltip
        label='Allocated memory displayed in "requests / limits" format. Values are added up from all containers that have them specified by the user. '
        width={370}
      >
        <InfoOutlineIcon size={14} />
      </Tooltip>
    </div>
  ),
})

export function usePodsColumns(): Array<object> {
  const { colName, colNamespace, colCreationTimestamp, colAction } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      colNode,
      colImages,
      colRestarts,
      colCpu,
      colMemory,
      colContainers,
      colCreationTimestamp,
      colAction,
    ],
    [colName, colNamespace, colCreationTimestamp, colAction]
  )
}

export default function Pods() {
  const cluster = useCluster()
  const columns = usePodsColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<PodListT, PodT, PodsQuery, PodsQueryVariables>
      namespaced
      columns={columns}
      query={usePodsQuery}
      queryName="handleGetPods"
      itemsKey="pods"
    />
  )
}
