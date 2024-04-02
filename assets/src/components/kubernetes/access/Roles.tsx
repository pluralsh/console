import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Role_RoleList as RoleListT,
  Role_Role as RoleT,
  RolesQuery,
  RolesQueryVariables,
  useRolesQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  ROLES_REL_PATH,
  getAccessAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useKubernetesContext } from '../Kubernetes'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'access',
    url: getAccessAbsPath(cluster?.id),
  },
  {
    label: 'roles',
    url: `${getAccessAbsPath(cluster?.id)}/${ROLES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<RoleT>()

export default function Roles() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  // TODO: Fix query for all namespaces.
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
