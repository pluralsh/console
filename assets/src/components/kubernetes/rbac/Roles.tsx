import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { Maybe } from '../../../generated/graphql-kubernetes'

import { RoleRole, RoleRoleList } from '../../../generated/kubernetes'
import {
  getAllRolesInfiniteOptions,
  getRolesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  ROLES_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { useDefaultColumns } from '../common/utils'
import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'roles',
    url: `${getRbacAbsPath(cluster?.id)}/${ROLES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<RoleRole>()

export default function Roles() {
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
    <UpdatedResourceList<RoleRoleList, RoleRole>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getRolesInfiniteOptions
          : getAllRolesInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
