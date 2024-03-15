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

const columnHelper = createColumnHelper<ReplicationControllerT>()

export default function CronReplicationControllers() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
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
