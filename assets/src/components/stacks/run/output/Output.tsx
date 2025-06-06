import { ReactNode, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CheckIcon,
  CloseIcon,
  EmptyState,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { StackOutput } from '../../../../generated/graphql'

import OutputValue from './Value'
import { StackRunOutletContextT } from '../Route.tsx'

const columnHelper = createColumnHelper<StackOutput>()

const colName = columnHelper.accessor((o) => o.name, {
  id: 'name',
  header: 'Name',
  cell: ({ getValue }) => <span>{getValue()}</span>,
})

const colValue = columnHelper.accessor((o) => o, {
  id: 'value',
  header: 'Value',
  cell: function Cell({ getValue }): ReactNode {
    const output = getValue()

    return (
      <OutputValue
        value={output.value}
        secret={output.secret ?? false}
      />
    )
  },
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
  const { stackRun } = useOutletContext<StackRunOutletContextT>()
  const isEmpty = (stackRun.output ?? []).length === 0
  const columns = useColumns()

  return isEmpty ? (
    <EmptyState message="No output available for this run." />
  ) : (
    <Table
      data={stackRun.output ?? []}
      columns={columns}
      maxHeight="100%"
    />
  )
}
