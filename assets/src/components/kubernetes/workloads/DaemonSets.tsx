import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Daemonset_DaemonSetList as DaemonSetListT,
  Daemonset_DaemonSet as DaemonSetT,
  DaemonSetsQuery,
  DaemonSetsQueryVariables,
  useDaemonSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

import { WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<DaemonSetT>()

const colStatus = columnHelper.accessor((ds) => ds.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function CronJobs() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colStatus, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      DaemonSetListT,
      DaemonSetT,
      DaemonSetsQuery,
      DaemonSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useDaemonSetsQuery}
      queryName="handleGetDaemonSetList"
      itemsKey="daemonSets"
    />
  )
}
