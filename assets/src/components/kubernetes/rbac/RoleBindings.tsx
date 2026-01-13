import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  RolebindingRoleBinding,
  RolebindingRoleBindingList,
} from '../../../generated/kubernetes'
import {
  getAllRoleBindingsInfiniteOptions,
  getRoleBindingsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  ROLE_BINDINGS_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { ResourceList } from '../common/ResourceList.tsx'
import { useDefaultColumns } from '../common/utils'
import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (
  cluster?: Nullable<KubernetesClusterFragment>
) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'role bindings',
    url: `${getRbacAbsPath(cluster?.id)}/${ROLE_BINDINGS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<RolebindingRoleBinding>()

export default function RoleBindings() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp, colAction],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<RolebindingRoleBindingList, RolebindingRoleBinding>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getRoleBindingsInfiniteOptions
          : getAllRoleBindingsInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
