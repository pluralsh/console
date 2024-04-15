import { createColumnHelper } from '@tanstack/react-table'

import { Namespace } from 'generated/graphql'
import { toDateOrUndef } from 'utils/date'

import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { Chip } from '@pluralsh/design-system'

const columnHelper = createColumnHelper<Namespace>()

export const ColName = columnHelper.accessor((namespace) => namespace, {
  id: 'name',
  header: 'Name',
  meta: { truncate: true, gridTemplate: 'minmax(180px,300px)' },
  cell: function Cell({ getValue }) {
    const namespace = getValue()

    return namespace ? namespace.metadata.name : '--'
  },
})

export const ColNamespace = columnHelper.accessor((namespace) => namespace, {
  id: 'namespace',
  header: 'Namespace',
  meta: { truncate: true, gridTemplate: 'minmax(180px,300px)' },
  cell: function Cell({ getValue }) {
    const namespace = getValue()

    return namespace ? namespace.metadata.name : '--'
  },
})

export const ColStatus = columnHelper.accessor((namespace) => namespace, {
  id: 'status',
  header: 'Status',
  meta: { truncate: true, gridTemplate: 'minmax(180px,300px)' },
  cell: function Cell({ getValue }) {
    const namespace = getValue()
    const namespacePhaseSeverity = {
      active: 'success',
      terminating: 'error',
    }
    const phase = namespace?.status.phase?.toLowerCase() || 'Unknown'

    return (
      <Chip
        severity={namespacePhaseSeverity[phase]}
        css={{ width: 'fit-content' }}
      >
        {namespace.status.phase}
      </Chip>
    )
  },
})

export const ColFinalizers = columnHelper.accessor((namespace) => namespace, {
  id: 'finalizers',
  header: 'Finalizers',
  meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const namespace = getValue()

    const finalizers = namespace?.spec.finalizers?.join(', ')

    return finalizers || ''
  },
})

export const ColCreatedAt = columnHelper.accessor(
  (namespace) => {
    const insertedAt = toDateOrUndef(namespace?.metadata.creationTimestamp)

    return insertedAt || undefined
  },
  {
    id: 'createdAt',
    header: 'Created at',
    sortingFn: 'datetime',
    cell: ({ getValue }) => <DateTimeCol date={getValue()?.toISOString()} />,
  }
)
