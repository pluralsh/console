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
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'

import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  NETWORK_POLICIES_REL_PATH,
  getDiscoveryAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useClusterContext } from '../Cluster'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'discovery',
    url: getDiscoveryAbsPath(cluster?.id),
  },
  {
    label: 'network policies',
    url: `${getDiscoveryAbsPath(cluster?.id)}/${NETWORK_POLICIES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NetworkPolicyT>()

export default function NetworkPolicies() {
  const { cluster } = useClusterContext()

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
