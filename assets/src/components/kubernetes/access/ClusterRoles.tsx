import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Clusterrole_ClusterRoleList as ClusterRoleListT,
  Clusterrole_ClusterRole as ClusterRoleT,
  ClusterRolesQuery,
  ClusterRolesQueryVariables,
  Maybe,
  useClusterRolesQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  CLUSTER_ROLES_REL_PATH,
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
    label: 'cluster roles',
    url: `${getAccessAbsPath(cluster?.id)}/${CLUSTER_ROLES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ClusterRoleT>()

export default function ClusterRoles() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colLabels, colCreationTimestamp],
    [colName, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      ClusterRoleListT,
      ClusterRoleT,
      ClusterRolesQuery,
      ClusterRolesQueryVariables
    >
      columns={columns}
      query={useClusterRolesQuery}
      queryName="handleGetClusterRoleList"
      itemsKey="items"
    />
  )
}
