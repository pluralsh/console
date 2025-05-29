import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Serviceaccount_ServiceAccount as ServiceAccountT,
  Serviceaccount_ServiceAccountList as ServiceAccountListT,
  ServiceAccountsDocument,
  ServiceAccountsQuery,
  ServiceAccountsQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getRbacAbsPath,
  SERVICE_ACCOUNTS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

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
      queryDocument={ServiceAccountsDocument}
      queryName="handleGetServiceAccountList"
      itemsKey="items"
    />
  )
}
