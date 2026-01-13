import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  ClusterrolebindingClusterRoleBinding,
  ClusterrolebindingClusterRoleBindingList,
} from '../../../generated/kubernetes'
import { getClusterRoleBindingsInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  CLUSTER_ROLE_BINDINGS_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList.tsx'
import { useDefaultColumns } from '../common/utils'

import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (
  cluster?: Nullable<KubernetesClusterFragment>
) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'cluster role bindings',
    url: `${getRbacAbsPath(cluster?.id)}/${CLUSTER_ROLE_BINDINGS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ClusterrolebindingClusterRoleBinding>()

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
      ClusterrolebindingClusterRoleBindingList,
      ClusterrolebindingClusterRoleBinding
    >
      columns={columns}
      queryOptions={getClusterRoleBindingsInfiniteOptions}
      itemsKey="items"
    />
  )
}
