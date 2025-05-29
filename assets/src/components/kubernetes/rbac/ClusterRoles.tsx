import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Clusterrole_ClusterRole as ClusterRoleT,
  Clusterrole_ClusterRoleList as ClusterRoleListT,
  ClusterRolesDocument,
  ClusterRolesQuery,
  ClusterRolesQueryVariables,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import {
  CLUSTER_ROLES_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'cluster roles',
    url: `${getRbacAbsPath(cluster?.id)}/${CLUSTER_ROLES_REL_PATH}`,
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
      queryDocument={ClusterRolesDocument}
      queryName="handleGetClusterRoleList"
      itemsKey="items"
    />
  )
}
