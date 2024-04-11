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
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  SERVICE_ACCOUNTS_REL_PATH,
  getAccessAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'access',
    url: getAccessAbsPath(cluster?.id),
  },
  {
    label: 'service accounts',
    url: `${getAccessAbsPath(cluster?.id)}/${SERVICE_ACCOUNTS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ServiceAccountT>()

export default function ServiceAccounts() {
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
