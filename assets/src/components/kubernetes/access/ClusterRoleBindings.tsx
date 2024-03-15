import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Clusterrolebinding_ClusterRoleBindingList as ClusterRoleBindingListT,
  Clusterrolebinding_ClusterRoleBinding as ClusterRoleBindingT,
  ClusterRoleBindingsQuery,
  ClusterRoleBindingsQueryVariables,
  useClusterRoleBindingsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<ClusterRoleBindingT>()

export default function ClusterRoleBindings() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      ClusterRoleBindingListT,
      ClusterRoleBindingT,
      ClusterRoleBindingsQuery,
      ClusterRoleBindingsQueryVariables
    >
      namespaced
      columns={columns}
      query={useClusterRoleBindingsQuery}
      queryName="handleGetClusterRoleBindingList"
      itemsKey="items"
    />
  )
}
