import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  NetworkPoliciesQuery,
  NetworkPoliciesQueryVariables,
  Networkpolicy_NetworkPolicyList as NetworkPolicyListT,
  Networkpolicy_NetworkPolicy as NetworkPolicyT,
  useNetworkPoliciesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'

import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  NETWORK_POLICIES_REL_PATH,
  getDiscoveryAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getDiscoveryBreadcrumbs } from './Discovery'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getDiscoveryBreadcrumbs(cluster),
  {
    label: 'network policies',
    url: `${getDiscoveryAbsPath(cluster?.id)}/${NETWORK_POLICIES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NetworkPolicyT>()

export default function NetworkPolicies() {
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
      NetworkPolicyListT,
      NetworkPolicyT,
      NetworkPoliciesQuery,
      NetworkPoliciesQueryVariables
    >
      namespaced
      columns={columns}
      query={useNetworkPoliciesQuery}
      queryName="handleGetNetworkPolicyList"
      itemsKey="items"
    />
  )
}
