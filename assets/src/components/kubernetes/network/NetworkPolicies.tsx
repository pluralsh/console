import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  NetworkPoliciesDocument,
  NetworkPoliciesQuery,
  NetworkPoliciesQueryVariables,
  Networkpolicy_NetworkPolicy as NetworkPolicyT,
  Networkpolicy_NetworkPolicyList as NetworkPolicyListT,
} from '../../../generated/graphql-kubernetes'
import {
  getNetworkAbsPath,
  NETWORK_POLICIES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

import { getNetworkBreadcrumbs } from './Network'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'network policies',
    url: `${getNetworkAbsPath(cluster?.id)}/${NETWORK_POLICIES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NetworkPolicyT>()

export default function NetworkPolicies() {
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
      NetworkPolicyListT,
      NetworkPolicyT,
      NetworkPoliciesQuery,
      NetworkPoliciesQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={NetworkPoliciesDocument}
      queryName="handleGetNetworkPolicyList"
      itemsKey="items"
    />
  )
}
