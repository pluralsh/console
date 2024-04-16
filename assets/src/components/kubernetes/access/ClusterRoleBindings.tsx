import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Clusterrolebinding_ClusterRoleBindingList as ClusterRoleBindingListT,
  Clusterrolebinding_ClusterRoleBinding as ClusterRoleBindingT,
  ClusterRoleBindingsQuery,
  ClusterRoleBindingsQueryVariables,
  Maybe,
  useClusterRoleBindingsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  CLUSTER_ROLE_BINDINGS_REL_PATH,
  getAccessAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getAccessBreadcrumbs } from './Access'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getAccessBreadcrumbs(cluster),
  {
    label: 'cluster role bindings',
    url: `${getAccessAbsPath(cluster?.id)}/${CLUSTER_ROLE_BINDINGS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ClusterRoleBindingT>()

export default function ClusterRoleBindings() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colLabels, colCreationTimestamp],
    [colName, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      ClusterRoleBindingListT,
      ClusterRoleBindingT,
      ClusterRoleBindingsQuery,
      ClusterRoleBindingsQueryVariables
    >
      columns={columns}
      query={useClusterRoleBindingsQuery}
      queryName="handleGetClusterRoleBindingList"
      itemsKey="items"
    />
  )
}
