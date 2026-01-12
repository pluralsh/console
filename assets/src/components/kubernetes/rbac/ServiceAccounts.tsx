import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  ServiceaccountServiceAccount,
  ServiceaccountServiceAccountList,
} from '../../../generated/kubernetes'
import {
  getAllServiceAccountsInfiniteOptions,
  getServiceAccountsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  SERVICE_ACCOUNTS_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { useDefaultColumns } from '../common/utils'
import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (
  cluster?: Nullable<KubernetesClusterFragment>
) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'service accounts',
    url: `${getRbacAbsPath(cluster?.id)}/${SERVICE_ACCOUNTS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ServiceaccountServiceAccount>()

export default function ServiceAccounts() {
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
    <UpdatedResourceList<
      ServiceaccountServiceAccountList,
      ServiceaccountServiceAccount
    >
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getServiceAccountsInfiniteOptions
          : getAllServiceAccountsInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
