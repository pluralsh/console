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
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  CLUSTER_ROLES_REL_PATH,
  getAccessAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getAccessBreadcrumbs } from './Access'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getAccessBreadcrumbs(cluster),
  {
    label: 'cluster roles',
    url: `${getAccessAbsPath(cluster?.id)}/${CLUSTER_ROLES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ClusterRoleT>()

export default function ClusterRoles() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colLabels, colCreationTimestamp, colAction],
    [colName, colLabels, colCreationTimestamp, colAction]
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
