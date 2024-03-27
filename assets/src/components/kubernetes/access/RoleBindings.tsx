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
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  ROLE_BINDINGS_REL_PATH,
  getAccessAbsPath,
  getKubernetesAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useKubernetesContext } from '../Kubernetes'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'access',
    url: getAccessAbsPath(cluster?.id),
  },
  {
    label: 'role bindings',
    url: `${getAccessAbsPath(cluster?.id)}/${ROLE_BINDINGS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<RoleBindingT>()

export default function RoleBindings() {
  const { cluster } = useKubernetesContext()

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
