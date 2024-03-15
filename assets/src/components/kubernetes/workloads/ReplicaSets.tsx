import { ChipList } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import {
  Replicaset_ReplicaSetList as ReplicaSetListT,
  Replicaset_ReplicaSet as ReplicaSetT,
  ReplicaSetsQuery,
  ReplicaSetsQueryVariables,
  useReplicaSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<ReplicaSetT>()

const columns = [
  columnHelper.accessor((deployment) => deployment?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((deployment) => deployment?.objectMeta.namespace, {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((deployment) => deployment?.objectMeta.labels, {
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
  columnHelper.accessor(
    (deployment) => deployment?.objectMeta.creationTimestamp,
    {
      id: 'creationTimestamp',
      header: 'Created',
      enableSorting: true,
      cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
    }
  ),
]

export default function ReplicaSets() {
  return (
    <ResourceList<
      ReplicaSetListT,
      ReplicaSetT,
      ReplicaSetsQuery,
      ReplicaSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicaSetsQuery}
      queryName="handleGetReplicaSets"
      itemsKey="replicaSets"
    />
  )
}
