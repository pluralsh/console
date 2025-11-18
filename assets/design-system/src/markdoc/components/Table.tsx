import { createColumnHelper } from '@tanstack/react-table'

import { Fragment } from 'react'

import { Table as PluralTable } from '../../index'

type TableProps = {
  thead: any[]
  tbody: any[]
}

function Table({ thead, tbody }: TableProps) {
  const columnHelper = createColumnHelper<any>()

  if (!tbody || !thead) {
    return null
  }

  const columns = thead.map((th, idx) =>
    columnHelper.accessor((row) => row[idx], {
      id: th,
      cell: (info) => <Fragment key={idx}>{info.getValue()}</Fragment>,
      header: () => <span>{th}</span>,
    })
  )

  return (
    <PluralTable
      columns={columns}
      data={tbody}
    />
  )
}

export default Table
