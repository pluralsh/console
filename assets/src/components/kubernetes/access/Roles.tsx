import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Role_RoleList as RoleListT,
  Role_Role as RoleT,
  RolesQuery,
  RolesQueryVariables,
  useRolesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<RoleT>()

export default function Roles() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<RoleListT, RoleT, RolesQuery, RolesQueryVariables>
      namespaced
      columns={columns}
      query={useRolesQuery}
      queryName="handleGetRoleList"
      itemsKey="items"
    />
  )
}
