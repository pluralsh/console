import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  NetworkPoliciesQuery,
  NetworkPoliciesQueryVariables,
  Networkpolicy_NetworkPolicyList as NetworkPolicyListT,
  Networkpolicy_NetworkPolicy as NetworkPolicyT,
  useNetworkPoliciesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'

import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<NetworkPolicyT>()

export default function NetworkPolicies() {
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
