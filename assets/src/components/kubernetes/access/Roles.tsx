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
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  ROLES_REL_PATH,
  getAccessAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getAccessBreadcrumbs } from './Access'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getAccessBreadcrumbs(cluster),
  {
    label: 'roles',
    url: `${getAccessAbsPath(cluster?.id)}/${ROLES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<RoleT>()

export default function Roles() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp, colAction],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
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
