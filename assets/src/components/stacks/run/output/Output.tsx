import { ReactNode, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CheckIcon, CloseIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { StackOutput, StackRun } from '../../../../generated/graphql'

const columnHelper = createColumnHelper<StackOutput>()

const colName = columnHelper.accessor((o) => o.name, {
  id: 'name',
  header: 'Name',
  cell: ({ getValue }) => <span>{getValue()}</span>,
})

const colValue = columnHelper.accessor((o) => o.value, {
  id: 'value',
  header: 'Value',
  cell: ({ getValue }) => <span>{getValue()}</span>,
})

const colSecret = columnHelper.accessor((o) => o.secret, {
  id: 'secret',
  header: 'Secret',
  cell: ({ getValue }) => (getValue() ? <CheckIcon /> : <CloseIcon />),
})

function useColumns(): Array<object> {
  return useMemo(() => [colName, colValue, colSecret], [])
}

export default function StackRunOutput(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()
  const isEmpty = (stackRun.output ?? []).length === 0
  const columns = useColumns()

  return isEmpty ? (
    <div>No output available for this run.</div>
  ) : (
    <Table
      data={stackRun.output ?? []}
      columns={columns}
      maxHeight="100%"
    />
  )
}
