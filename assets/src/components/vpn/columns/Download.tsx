import { DownloadIcon, IconFrame } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnDownload = ColumnBuilder.display({
  id: 'download',
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
      icon={<DownloadIcon />}
      tooltip="Download configuration"
      clickable
    />
  )
}

export { ColumnDownload }
