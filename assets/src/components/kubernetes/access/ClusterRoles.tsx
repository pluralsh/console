import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Clusterrole_ClusterRoleList as ClusterRoleListT,
  Clusterrole_ClusterRole as ClusterRoleT,
  ClusterRolesQuery,
  ClusterRolesQueryVariables,
  useClusterRolesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<ClusterRoleT>()

export default function ClusterRoles() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      ClusterRoleListT,
      ClusterRoleT,
      ClusterRolesQuery,
      ClusterRolesQueryVariables
    >
      namespaced
      columns={columns}
      query={useClusterRolesQuery}
      queryName="handleGetClusterRoleList"
      itemsKey="items"
    />
  )
}
