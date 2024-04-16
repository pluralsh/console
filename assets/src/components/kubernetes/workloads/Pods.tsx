import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

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
import { InlineLink } from '../../utils/typography/InlineLink'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  PODS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ContainerStatuses } from '../../cluster/ContainerStatuses'
import { ContainerStatusT } from '../../cluster/pods/PodsList'

import { Kind } from '../common/types'

import { WorkloadImages, toReadiness } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
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

// TODO: Remove?
// const colStatus = columnHelper.accessor((pod) => pod, {
//   id: 'status',
//   header: 'Status',
//   cell: ({ getValue }) => {
//     const { status, warnings } = getValue()
//
//     return (
//       <PodStatusChip
//         status={status}
//         warnings={warnings}
//       />
//     )
//   },
// })

const colNode = columnHelper.accessor((pod) => pod?.nodeName, {
  id: 'node',
  header: 'Node',
  cell: ({ getValue, table }) => {
    const { cluster } = table.options.meta as {
      cluster?: ClusterTinyFragment
    }

    return (
      <Link
        to={getResourceDetailsAbsPath(cluster?.id, Kind.Node, getValue())}
        onClick={(e) => e.stopPropagation()}
      >
        <InlineLink>{getValue()}</InlineLink>
      </Link>
    )
  },
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

export function usePodsColumns(): Array<object> {
  const { colName, colNamespace, colCreationTimestamp } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      colNode,
      colImages,
      colRestarts,
      // TODO: Add CPU and memory.
      colContainers,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colCreationTimestamp]
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
