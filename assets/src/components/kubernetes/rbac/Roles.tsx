import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Role_Role as RoleT,
  Role_RoleList as RoleListT,
  RolesDocument,
  RolesQuery,
  RolesQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getRbacAbsPath,
  ROLES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'roles',
    url: `${getRbacAbsPath(cluster?.id)}/${ROLES_REL_PATH}`,
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
      queryDocument={RolesDocument}
      queryName="handleGetRoleList"
      itemsKey="items"
    />
  )
}
