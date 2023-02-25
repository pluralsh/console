import { Table as PluralTable } from '@pluralsh/design-system'

import { createColumnHelper } from '@tanstack/react-table'

type TableProps = {
  thead: any[]
  tbody: any[]
}

function Table({ thead, tbody }: TableProps) {
  const columnHelper = createColumnHelper<any>()

  if (!tbody || !thead) {
    return null
  }

  // const data = tbody.map(tr => Object.fromEntries(tr.map((td, idx) => [`x${idx}`, td])))

  const columns = thead.map((th, idx) => columnHelper.accessor(row => row[idx], {
    id: th,
    cell: (info: any) => info.getValue(),
    header: () => <span>{th}</span>,
  }))

  return (
    <PluralTable
      columns={columns}
      data={tbody}
    />
  )
}

export default Table
