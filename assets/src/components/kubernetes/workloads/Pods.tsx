import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  PodsQuery,
  PodsQueryVariables,
  usePodsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { InlineLink } from '../../utils/typography/InlineLink'
import { getNodeAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { ClusterTinyFragment } from '../../../generated/graphql'

import { PodStatusChip, WorkloadImages } from './utils'

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
      <InlineLink href={getNodeAbsPath(cluster?.id, getValue())}>
        {getValue()}
      </InlineLink>
    )
  },
})

const colRestarts = columnHelper.accessor((pod) => pod?.restartCount, {
  id: 'restarts',
  header: 'Restarts',
  cell: ({ getValue }) => getValue(),
})

export default function Pods() {
  const { colName, colNamespace, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
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
