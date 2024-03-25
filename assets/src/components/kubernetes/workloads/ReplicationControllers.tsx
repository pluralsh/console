import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Replicationcontroller_ReplicationControllerList as ReplicationControllerListT,
  Replicationcontroller_ReplicationController as ReplicationControllerT,
  ReplicationControllersQuery,
  ReplicationControllersQueryVariables,
  useReplicationControllersQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { UsageText } from '../../cluster/TableElements'

import { WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<ReplicationControllerT>()

const colImages = columnHelper.accessor((rc) => rc, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => {
    const { initContainerImages, containerImages } = getValue()

    return (
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 300,
        }}
      >
        {[...(initContainerImages ?? []), ...(containerImages ?? [])]?.map(
          (image) => (
            <span
              css={{
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {image}
            </span>
          )
        )}
      </div>
    )
  },
})

const colPods = columnHelper.accessor((rc) => rc.podInfo, {
  id: 'pods',
  header: 'Pods',
  cell: ({ getValue }) => {
    const podInfo = getValue()

    return (
      <UsageText>
        {podInfo.running} / {podInfo.desired}
      </UsageText>
    )
  },
})

const colStatus = columnHelper.accessor((rc) => rc.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function ReplicationControllers() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colImages,
      colPods,
      colStatus,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      ReplicationControllerListT,
      ReplicationControllerT,
      ReplicationControllersQuery,
      ReplicationControllersQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicationControllersQuery}
      queryName="handleGetReplicationControllerList"
      itemsKey="replicationControllers"
    />
  )
}
