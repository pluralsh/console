import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnDelete = ColumnBuilder.display({
  id: 'delete',
  header: '',
  enableGlobalFilter: false,
  enableSorting: false,
  meta: {
    truncate: true,
    gridTemplate: '48px',
  },
  cell,
})

function cell(_props: CellContext<VPNClientRow, unknown>): JSX.Element {
  // const row = props.row.original

  return (
    <IconFrame
      icon={<TrashCanIcon color="icon-danger" />}
      tooltip="Delete client"
      clickable
    />
  )
}

export { ColumnDelete }
