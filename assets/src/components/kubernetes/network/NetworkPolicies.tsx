import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  NetworkpolicyNetworkPolicy,
  NetworkpolicyNetworkPolicyList,
} from '../../../generated/kubernetes'
import {
  getAllNetworkPoliciesInfiniteOptions,
  getNetworkPoliciesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen'
import {
  getNetworkAbsPath,
  NETWORK_POLICIES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { useDefaultColumns } from '../common/utils'
import { getNetworkBreadcrumbs } from './Network'

export const getBreadcrumbs = (
  cluster?: KubernetesClusterFragment | null | undefined
) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'network policies',
    url: `${getNetworkAbsPath(cluster?.id)}/${NETWORK_POLICIES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NetworkpolicyNetworkPolicy>()

export default function NetworkPolicies() {
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
      NetworkpolicyNetworkPolicyList,
      NetworkpolicyNetworkPolicy
    >
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getNetworkPoliciesInfiniteOptions
          : getAllNetworkPoliciesInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
