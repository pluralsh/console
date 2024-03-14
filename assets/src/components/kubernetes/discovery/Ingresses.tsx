import { ChipList, LoopingLogo, Table } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'

import { isEmpty } from 'lodash'

import { useCallback } from 'react'

import {
  Ingress_Ingress as IngressT,
  Pod_Pod as PodT,
  useIngressesQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { useKubernetesContext } from '../Kubernetes'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import {
  DEFAULT_DATA_SELECT,
  extendConnection,
  usePageInfo,
  useSortedTableOptions,
} from '../utils'

const columnHelper = createColumnHelper<IngressT>()

const columns = [
  columnHelper.accessor((ingress) => ingress?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((ingress) => ingress?.objectMeta.namespace, {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((ingress) => ingress?.objectMeta.labels, {
    id: 'labels',
    header: 'Labels',
    cell: ({ getValue }) => {
      const labels = getValue()

      return (
        <ChipList
          size="small"
          limit={1}
          values={Object.entries(labels || {})}
          transformValue={(label) => label.join(': ')}
        />
      )
    },
  }),
  columnHelper.accessor((ingress) => ingress?.endpoints, {
    id: 'endpoints',
    header: 'Endpoints',
    cell: ({ getValue }) => JSON.stringify(getValue()),
  }),
  columnHelper.accessor((ingress) => ingress?.hosts, {
    id: 'hosts',
    header: 'Hosts',
    cell: ({ getValue }) => {
      const hosts = getValue()

      return isEmpty(hosts) ? '-' : hosts.map((host) => <div>{host}</div>)
    },
  }),
  columnHelper.accessor((ingress) => ingress?.objectMeta.creationTimestamp, {
    id: 'creationTimestamp',
    header: 'Creation',
    enableSorting: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

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
