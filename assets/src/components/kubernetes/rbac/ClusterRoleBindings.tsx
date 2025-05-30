import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Clusterrolebinding_ClusterRoleBinding as ClusterRoleBindingT,
  Clusterrolebinding_ClusterRoleBindingList as ClusterRoleBindingListT,
  ClusterRoleBindingsDocument,
  ClusterRoleBindingsQuery,
  ClusterRoleBindingsQueryVariables,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import {
  CLUSTER_ROLE_BINDINGS_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'cluster role bindings',
    url: `${getRbacAbsPath(cluster?.id)}/${CLUSTER_ROLE_BINDINGS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ClusterRoleBindingT>()

export default function ClusterRoleBindings() {
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
      ClusterRoleBindingListT,
      ClusterRoleBindingT,
      ClusterRoleBindingsQuery,
      ClusterRoleBindingsQueryVariables
    >
      columns={columns}
      queryDocument={ClusterRoleBindingsDocument}
      queryName="handleGetClusterRoleBindingList"
      itemsKey="items"
    />
  )
}
