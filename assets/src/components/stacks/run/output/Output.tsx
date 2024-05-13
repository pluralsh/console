import React, { ReactNode, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CheckIcon,
  CloseIcon,
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { StackOutput, StackRun } from '../../../../generated/graphql'

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
    const [hidden, setHidden] = useState(output.secret)
    const value = useMemo(
      () =>
        hidden
          ? Array(output.value.length)
              .fill('•', 0, Math.min(10, output.value.length))
              .join('')
          : output.value,
      [hidden, output.value]
    )

    return (
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {output.secret && (
          <IconFrame
            size="medium"
            clickable
            tooltip={hidden ? 'Reveal value' : 'Hide value'}
            icon={hidden ? <EyeClosedIcon /> : <EyeIcon />}
            onClick={() => setHidden(() => !hidden)}
          />
        )}
        <span css={{ wordBreak: 'break-word' }}>{value}</span>
      </div>
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
