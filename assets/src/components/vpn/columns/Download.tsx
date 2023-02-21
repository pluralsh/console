import {
  Button,
  DownloadIcon,
  IconFrame,
  Tooltip,
} from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'
import { useState } from 'react'

import { DownloadConfig } from '../actions/Download'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnDownload = ColumnBuilder.display({
  id: 'download',
  header: '',
  enableGlobalFilter: false,
  enableSorting: false,
  meta: {
    center: true,
    gridTemplate: '48px',
  },
  cell,
})

function cell(props: CellContext<VPNClientRow, unknown>): JSX.Element {
  const { isReady } = props.row.original

  return <DownloadAction disabled={!isReady} />
}

function DownloadAction({ disabled }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip label="Download configuration">
        <Button
          disabled={disabled}
          tertiary
          style={{
            padding: 0, width: 32, height: 32, minHeight: 32,
          }}
          onClick={() => setOpen(true)}
        >
          <DownloadIcon size={16} />
        </Button>
      </Tooltip>

      {open && <DownloadConfig onClose={() => setOpen(false)} />}
    </>
  )
}

export { ColumnDownload }
