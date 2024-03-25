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

import { PodStatusChip } from './utils'

const columnHelper = createColumnHelper<PodT>()

const colImages = columnHelper.accessor((pod) => pod?.containerImages, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 300,
      }}
    >
      {getValue()?.map((image) => (
        <span
          css={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {image}
        </span>
      ))}
    </div>
  ),
})

const colStatus = columnHelper.accessor((pod) => pod, {
  id: 'status',
  header: 'Status',
  enableSorting: true,
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

const colRestarts = columnHelper.accessor((pod) => pod?.restartCount, {
  id: 'restarts',
  header: 'Restarts',
  cell: ({ getValue }) => getValue(),
})

export default function CronPods() {
  const { colName, colNamespace, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colStatus,
      colRestarts,
      colImages,
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
