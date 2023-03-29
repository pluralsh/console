import { Tooltip } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'

import { TableText } from '../../cluster/TableElements'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnName = ColumnBuilder.accessor((row) => row.name, {
  id: 'name',
  header: 'Name',
  enableGlobalFilter: true,
  enableSorting: true,
  cell,
})

function cell(
  props: CellContext<VPNClientRow, string | undefined>
): JSX.Element {
  const name = props.getValue()

  return (
    <Tooltip
      label={name}
      placement="top-start"
    >
      <TableText>{name}</TableText>
    </Tooltip>
  )
}

export { ColumnName }
