import { Tooltip } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'

import { TableText } from '../../cluster/TableElements'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnAddress = ColumnBuilder.accessor(row => row.address, {
  id: 'address',
  header: 'Address',
  enableGlobalFilter: true,
  enableSorting: true,
  cell,
})

function cell(props: CellContext<VPNClientRow, string | undefined>): JSX.Element {
  const address = props.getValue()

  return (
    <Tooltip
      label={address}
      placement="top-start"
    >
      <TableText>{address}</TableText>
    </Tooltip>
  )
}

export { ColumnAddress }
