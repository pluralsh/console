import { ChipList, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { useKubernetesContext } from '../Kubernetes'
import {
  Pod_Pod as PodT,
  usePodsQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { DateTimeCol } from '../../utils/table/DateTimeCol'

const columnHelper = createColumnHelper<PodT>()

const columns = [
  columnHelper.accessor((pod) => pod?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((pod) => pod?.objectMeta.namespace, {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((pod) => pod?.objectMeta.labels, {
    id: 'labels',
    header: 'Labels',
    enableSorting: true,
    enableGlobalFilter: true,
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
    id: 'created',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export default function Pods() {
  const { cluster, namespace, filter } = useKubernetesContext()

  const { data, loading } = usePodsQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      filterBy: `name,${filter}`,
    },
  }) // TODO: Pagination and sorting.

  console.log(data)

  const pods = data?.handleGetPods?.pods || []

  if (loading) return <LoadingIndicator />

  return (
    <Table
      data={pods}
      columns={columns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
  )
}
