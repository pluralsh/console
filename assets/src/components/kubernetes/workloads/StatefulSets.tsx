import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Statefulset_StatefulSetList as StatefulSetListT,
  Statefulset_StatefulSet as StatefulSetT,
  StatefulSetsQuery,
  StatefulSetsQueryVariables,
  useStatefulSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../ResourceList'
import { useDefaultColumns } from '../utils'

import { UsageText } from '../../cluster/TableElements'

import { WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<StatefulSetT>()

const colImages = columnHelper.accessor((ss) => ss, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => {
    const ss = getValue()

    return (
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 300,
        }}
      >
        {[
          ...(ss.initContainerImages ?? []),
          ...(ss.containerImages ?? []),
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

const colPods = columnHelper.accessor((ss) => ss.podInfo, {
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

const colStatus = columnHelper.accessor((ss) => ss.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function StatefulSets() {
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
      StatefulSetListT,
      StatefulSetT,
      StatefulSetsQuery,
      StatefulSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useStatefulSetsQuery}
      queryName="handleGetStatefulSetList"
      itemsKey="statefulSets"
    />
  )
}
