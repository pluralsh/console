import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { Chip } from '@pluralsh/design-system'

import {
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  PodsQuery,
  PodsQueryVariables,
  usePodsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

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

const statusToSeverity = {
  Running: 'success',
  Completed: 'info',
  Succeeded: 'info',
  Pending: 'warning',
  NotReady: 'warning',
  Failed: 'danger',
  Terminating: 'danger',
}

const colStatus = columnHelper.accessor((pod) => pod?.status, {
  id: 'status',
  header: 'Status',
  enableSorting: true,
  cell: ({ getValue }) => {
    const status = getValue()
    const severity = statusToSeverity[status] ?? 'neutral'

    return (
      <Chip
        size="small"
        severity={severity}
      >
        {getValue()}
      </Chip>
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
