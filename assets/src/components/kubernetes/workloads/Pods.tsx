import { ChipList, LoopingLogo, Table } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'
import { useCallback } from 'react'

import { useKubernetesContext } from '../Kubernetes'
import {
  Pod_Pod as PodT,
  usePodsQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import {
  DEFAULT_DATA_SELECT,
  extendConnection,
  usePageInfo,
  useSortedTableOptions,
} from '../utils'

const columnHelper = createColumnHelper<PodT>()

const columns = [
  columnHelper.accessor((pod) => pod?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((pod) => pod?.objectMeta.namespace, {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((pod) => pod?.objectMeta.labels, {
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
  columnHelper.accessor((pod) => pod?.objectMeta.creationTimestamp, {
    id: 'creationTimestamp',
    header: 'Created',
    enableSorting: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export default function Pods() {
  const { cluster, namespace, filter } = useKubernetesContext()
  const { sorting, reactTableOptions } = useSortedTableOptions<PodT>()

  const { data, loading, fetchMore } = usePodsQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      ...DEFAULT_DATA_SELECT,
      filterBy: `name,${filter}`,
      sortBy: sorting.map((s) => `${s.desc ? 'd' : 'a'},${s.id}`).join(','),
    },
  })

  const pods = data?.handleGetPods?.pods || []
  const { page, hasNextPage } = usePageInfo(pods, data?.handleGetPods?.listMeta)

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult, 'handleGetPods', 'pods'),
    })
  }, [fetchMore, hasNextPage, page])

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        data={pods}
        columns={columns}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        // virtualizeRows
        // reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
        // onVirtualSliceChange={setVirtualSlice}
        onRowClick={(_e, { original }: Row<PodT>) => console.log(original)} // TODO: Redirect.
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
