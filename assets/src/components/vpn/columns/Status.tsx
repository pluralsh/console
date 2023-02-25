import { Chip, Tooltip } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnStatus = ColumnBuilder.accessor(row => row.isReady, {
  id: 'status',
  header: 'Status',
  enableGlobalFilter: true,
  enableSorting: true,
  cell,
})

function cell(props: CellContext<VPNClientRow, boolean | undefined>): JSX.Element {
  const isReady = props.getValue()
  const label = isReady ? 'Ready' : 'Pending'
  const severity = isReady ? 'success' : 'info'

  return (
    <Tooltip
      label={label}
      placement="top-start"
    >
      <Chip
        severity={severity}
        loading={!isReady}
      >{label}
      </Chip>
    </Tooltip>
  )
}

export { ColumnStatus }
