import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Replicaset_ReplicaSetList as ReplicaSetListT,
  Replicaset_ReplicaSet as ReplicaSetT,
  ReplicaSetsQuery,
  ReplicaSetsQueryVariables,
  useReplicaSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../ResourceList'
import { useDefaultColumns } from '../utils'

import { UsageText } from '../../cluster/TableElements'

import { WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<ReplicaSetT>()

const colImages = columnHelper.accessor((rs) => rs, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => {
    const rs = getValue()

    return (
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 300,
        }}
      >
        {[
          ...(rs.initContainerImages ?? []),
          ...(rs.containerImages ?? []),
        ]?.map((image) => (
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
    )
  },
})

const colPods = columnHelper.accessor((rs) => rs.podInfo, {
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

const colStatus = columnHelper.accessor((rs) => rs.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function ReplicaSets() {
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
      ReplicaSetListT,
      ReplicaSetT,
      ReplicaSetsQuery,
      ReplicaSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicaSetsQuery}
      queryName="handleGetReplicaSets"
      itemsKey="replicaSets"
    />
  )
}
