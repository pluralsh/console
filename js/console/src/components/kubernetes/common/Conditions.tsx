import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { CommonCondition } from 'generated/kubernetes'

const columnHelper = createColumnHelper<CommonCondition>()

interface ConditionsProps {
  conditions: Array<CommonCondition>
  maxHeight?: string
}

const columns = [
  // Timestamp
  columnHelper.accessor((condition) => condition?.lastTransitionTime, {
    id: 'timestamp',
    header: 'Timestamp',
    cell: ({ getValue }) => getValue(),
  }),
  // Type
  columnHelper.accessor((condition) => condition?.type, {
    id: 'type',
    header: 'Type',
    cell: ({ getValue }) => getValue(),
  }),
  // Status
  columnHelper.accessor((condition) => condition?.status, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => getValue(),
  }),
  // Reason
  columnHelper.accessor((condition) => condition?.reason, {
    id: 'reason',
    header: 'Reason',
    cell: ({ getValue }) => getValue() || '-',
  }),
  // Message
  columnHelper.accessor((condition) => condition?.message, {
    id: 'message',
    header: 'Message',
    cell: ({ getValue }) => getValue() || '-',
  }),
]

export default function ConditionsTable({ conditions }: ConditionsProps) {
  return (
    <Table
      fullHeightWrap
      data={conditions ?? []}
      columns={columns}
      maxHeight="500px"
      emptyStateProps={{
        message: 'No conditions found.',
      }}
    />
  )
}
