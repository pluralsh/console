import { Tooltip } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'

import { TableText } from '../../cluster/TableElements'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnStatus = ColumnBuilder.accessor(row => row.status, {
  id: 'status',
  header: 'Status',
  enableGlobalFilter: true,
  enableSorting: true,
  cell,
})

function cell(props: CellContext<VPNClientRow, string | undefined>): JSX.Element {
  const status = props.getValue()

  return (
    <Tooltip
      label={status}
      placement="top-start"
    >
      <TableText>{status}</TableText>
    </Tooltip>
  )
}

export { ColumnStatus }
