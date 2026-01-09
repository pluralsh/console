import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { Maybe } from '../../../generated/graphql-kubernetes'

import {
  ClusterroleClusterRole,
  ClusterroleClusterRoleList,
} from '../../../generated/kubernetes'
import { getClusterRolesInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  CLUSTER_ROLES_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { useDefaultColumns } from '../common/utils'

import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'cluster roles',
    url: `${getRbacAbsPath(cluster?.id)}/${CLUSTER_ROLES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ClusterroleClusterRole>()

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
    <UpdatedResourceList<ClusterroleClusterRoleList, ClusterroleClusterRole>
      columns={columns}
      queryOptions={getClusterRolesInfiniteOptions}
      itemsKey="items"
    />
  )
}
