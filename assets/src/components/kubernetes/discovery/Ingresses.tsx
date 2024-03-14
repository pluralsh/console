import { LoopingLogo, Table } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { useCallback, useMemo } from 'react'

import {
  Ingress_Ingress as IngressT,
  Pod_Pod as PodT,
  useIngressesQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { useKubernetesContext } from '../Kubernetes'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import {
  DEFAULT_DATA_SELECT,
  extendConnection,
  useDefaultColumns,
  usePageInfo,
  useSortedTableOptions,
} from '../utils'

const columnHelper = createColumnHelper<IngressT>()

const colEndpoints = columnHelper.accessor((ingress) => ingress?.endpoints, {
  id: 'endpoints',
  header: 'Endpoints',
  cell: ({ getValue }) => JSON.stringify(getValue()),
})

const colHosts = columnHelper.accessor((ingress) => ingress?.hosts, {
  id: 'hosts',
  header: 'Hosts',
  cell: ({ getValue }) => {
    const hosts = getValue()

    return isEmpty(hosts) ? '-' : hosts.map((host) => <div>{host}</div>)
  },
})

export default function Ingresses() {
  const { cluster, namespace, filter } = useKubernetesContext()
  const { sortBy, reactTableOptions } = useSortedTableOptions<IngressT>()

  const { data, loading, fetchMore } = useIngressesQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      ...DEFAULT_DATA_SELECT,
      filterBy: `name,${filter}`,
      sortBy,
    },
  })

  const ingresses = data?.handleGetIngressList?.items || []
  const { page, hasNextPage } = usePageInfo(
    ingresses,
    data?.handleGetIngressList?.listMeta
  )

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult,
          'handleGetIngressList',
          'items'
        ),
    })
  }, [fetchMore, hasNextPage, page])

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns<IngressT>(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colLabels,
      colHosts,
      colEndpoints,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        data={ingresses}
        columns={columns}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        onRowClick={(_e, { original }: Row<PodT>) => console.log(original)}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
