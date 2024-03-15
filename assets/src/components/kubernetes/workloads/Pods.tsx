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

const columnHelper = createColumnHelper<PodT>()

export default function CronPods() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
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
