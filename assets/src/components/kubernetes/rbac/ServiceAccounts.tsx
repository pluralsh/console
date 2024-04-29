import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Serviceaccount_ServiceAccountList as ServiceAccountListT,
  Serviceaccount_ServiceAccount as ServiceAccountT,
  ServiceAccountsQuery,
  ServiceAccountsQueryVariables,
  useServiceAccountsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  SERVICE_ACCOUNTS_REL_PATH,
  getRbacAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getRbacBreadcrumbs } from './Rbac'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getRbacBreadcrumbs(cluster),
  {
    label: 'service accounts',
    url: `${getRbacAbsPath(cluster?.id)}/${SERVICE_ACCOUNTS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ServiceAccountT>()

export default function ServiceAccounts() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp, colAction],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<
      ServiceAccountListT,
      ServiceAccountT,
      ServiceAccountsQuery,
      ServiceAccountsQueryVariables
    >
      namespaced
      columns={columns}
      query={useServiceAccountsQuery}
      queryName="handleGetServiceAccountList"
      itemsKey="items"
    />
  )
}
