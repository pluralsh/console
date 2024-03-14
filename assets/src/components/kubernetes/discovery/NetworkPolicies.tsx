import { Row, createColumnHelper } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { LoopingLogo, Table } from '@pluralsh/design-system'

import {
  Networkpolicy_NetworkPolicy as NetworkPolicyT,
  useNetworkPoliciesQuery,
} from '../../../generated/graphql-kubernetes'
import { useKubernetesContext } from '../Kubernetes'
import {
  DEFAULT_DATA_SELECT,
  extendConnection,
  useDefaultColumns,
  usePageInfo,
  useSortedTableOptions,
} from '../utils'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

const columnHelper = createColumnHelper<NetworkPolicyT>()

export default function NetworkPolicies() {
  const { cluster, namespace, filter } = useKubernetesContext()
  const { sortBy, reactTableOptions } = useSortedTableOptions<NetworkPolicyT>()

  const { data, loading, fetchMore } = useNetworkPoliciesQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      ...DEFAULT_DATA_SELECT,
      filterBy: `name,${filter}`,
      sortBy,
    },
  })

  const networkPolicies = data?.handleGetNetworkPolicyList?.items || []
  const { page, hasNextPage } = usePageInfo(
    networkPolicies,
    data?.handleGetNetworkPolicyList?.listMeta
  )

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult,
          'handleGetNetworkPolicyList',
          'items'
        ),
    })
  }, [fetchMore, hasNextPage, page])

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns<NetworkPolicyT>(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        data={networkPolicies}
        columns={columns}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        onRowClick={(_e, { original }: Row<NetworkPolicyT>) =>
          console.log(original)
        }
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
