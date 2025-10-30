import { Chip, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { filesize } from 'filesize'
import { groupBy } from 'lodash'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'

import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  Maybe,
  Pod_Pod as PodT,
  Pod_PodList as PodListT,
  PodsDocument,
  PodsQuery,
  PodsQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getWorkloadsAbsPath,
  PODS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { isNonNullable } from '../../../utils/isNonNullable.ts'

import { ContainerStatusT } from '../../cd/cluster/pod/PodsList.tsx'
import { ContainerStatuses } from '../../cluster/ContainerStatuses'
import { UsageText } from '../../cluster/TableElements'
import { useCluster } from '../Cluster'
import ResourceLink from '../common/ResourceLink'
import { ResourceList } from '../common/ResourceList'
import { Kind } from '../common/types'
import { useDefaultColumns } from '../common/utils'
import { toReadiness, WorkloadImages } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'

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
  header: 'CPU',
  meta: {
    tooltip: (
      <div style={{ width: 370 }}>
        {`Allocated CPU displayed in "requests / limits" format. Values are added
        up from all containers that have them specified by the user.`}
      </div>
    ),
  },
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
})

const colMemory = columnHelper.accessor((row) => row?.allocatedResources, {
  id: 'memory',
  header: 'Memory',
  meta: {
    tooltip: (
      <div style={{ width: 370 }}>
        {`Allocated memory displayed in "requests / limits" format. Values are added
        up from all containers that have them specified by the user.`}
      </div>
    ),
  },
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
})

const colGPU = columnHelper.accessor((row) => row?.allocatedResources, {
  id: 'gpu',
  header: 'GPU',
  meta: {
    tooltip: (
      <div style={{ width: 370 }}>
        {`Allocated GPUs displayed in "requests / limits" format. Values are added
        up from all containers that have them specified by the user.`}
      </div>
    ),
  },
  cell: ({ getValue }) => {
    const theme = useTheme()
    const allocatedResources = getValue()
    const types: Set<string> = new Set(
      allocatedResources?.gpuRequests
        ?.map((gpu) => gpu?.type)
        .concat(allocatedResources?.gpuLimits?.map((gpu) => gpu?.type))
        .filter(isNonNullable)
    )

    const requestsByType = groupBy(
      allocatedResources?.gpuRequests,
      (gpu) => gpu?.type
    )

    const limitsByType = groupBy(
      allocatedResources?.gpuLimits,
      (gpu) => gpu?.type
    )

    return types.size > 0 ? (
      <Flex
        gap="xsmall"
        direction="column"
      >
        {types.values().map((type) => (
          <UsageText>
            <span>
              {requestsByType[type]?.length ?? '-'} /{' '}
              {limitsByType[type]?.length ?? '-'}
            </span>
            <Chip
              size="small"
              style={{ marginLeft: theme.spacing.small }}
            >
              {type}
            </Chip>
          </UsageText>
        ))}
      </Flex>
    ) : (
      '- / -'
    )
  },
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
      colGPU,
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
      queryDocument={PodsDocument}
      queryName="handleGetPods"
      itemsKey="pods"
    />
  )
}
