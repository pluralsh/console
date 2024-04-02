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
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { InlineLink } from '../../utils/typography/InlineLink'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  PODS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useKubernetesContext } from '../Kubernetes'

import { PodStatusChip, WorkloadImages } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'workloads',
    url: getWorkloadsAbsPath(cluster?.id),
  },
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

const colStatus = columnHelper.accessor((pod) => pod, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => {
    const { status, warnings } = getValue()

    return (
      <PodStatusChip
        status={status}
        warnings={warnings}
      />
    )
  },
})

const colNode = columnHelper.accessor((pod) => pod?.nodeName, {
  id: 'node',
  header: 'Node',
  cell: ({ getValue, table }) => {
    const { cluster } = table.options.meta as {
      cluster?: ClusterTinyFragment
    }

    return (
      <Link
        to={getResourceDetailsAbsPath(cluster?.id, 'node', getValue())}
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

export function usePodColumns(): Array<object> {
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
      colStatus,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colCreationTimestamp]
  )
}

export default function Pods() {
  const { cluster } = useKubernetesContext()
  const columns = usePodColumns()

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
