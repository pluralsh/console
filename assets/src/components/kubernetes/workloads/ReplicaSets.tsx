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

const columnHelper = createColumnHelper<ReplicaSetT>()

export default function ReplicaSets() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
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
