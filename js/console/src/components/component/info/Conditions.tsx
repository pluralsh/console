import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { StatusConditionFragment } from 'generated/graphql'
import { ComponentProps } from 'react'

const columnHelper = createColumnHelper<StatusConditionFragment>()

const ColType = columnHelper.accessor((row) => row.type, {
  id: 'type',
  header: 'Type',
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

const ColMessage = columnHelper.accessor((row) => row.message, {
  id: 'message',
  header: 'Message',
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

const ColReason = columnHelper.accessor((row) => row.reason, {
  id: 'reason',
  header: 'Reason',
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

const ColStatus = columnHelper.accessor((row) => row.reason, {
  id: 'status',
  header: 'Status',
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

const columns = [ColType, ColStatus, ColReason, ColMessage]

export function ConditionsTable({
  conditions,
  emptyStateProps,
  ...props
}: {
  conditions: Nullable<Nullable<StatusConditionFragment>[]>
} & Omit<ComponentProps<typeof Table>, 'columns' | 'data'>) {
  return (
    <Table
      columns={columns}
      emptyStateProps={{ message: 'No conditions found', ...emptyStateProps }}
      data={conditions || []}
      {...props}
    />
  )
}
