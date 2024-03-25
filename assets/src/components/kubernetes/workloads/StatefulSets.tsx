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

import { WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<StatefulSetT>()

const colStatus = columnHelper.accessor((ss) => ss.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function StatefulSets() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colStatus, colLabels, colCreationTimestamp],
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
