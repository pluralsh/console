import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Rolebinding_RoleBindingList as RoleBindingListT,
  Rolebinding_RoleBinding as RoleBindingT,
  RoleBindingsQuery,
  RoleBindingsQueryVariables,
  useRoleBindingsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  ROLE_BINDINGS_REL_PATH,
  getAccessAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getAccessBreadcrumbs } from './Access'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getAccessBreadcrumbs(cluster),
  {
    label: 'role bindings',
    url: `${getAccessAbsPath(cluster?.id)}/${ROLE_BINDINGS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<RoleBindingT>()

export default function RoleBindings() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      RoleBindingListT,
      RoleBindingT,
      RoleBindingsQuery,
      RoleBindingsQueryVariables
    >
      namespaced
      columns={columns}
      query={useRoleBindingsQuery}
      queryName="handleGetRoleBindingList"
      itemsKey="items"
    />
  )
}
