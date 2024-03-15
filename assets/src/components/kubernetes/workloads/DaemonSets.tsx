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

const columnHelper = createColumnHelper<DaemonSetT>()

export default function CronJobs() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
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
