import { Button, Tooltip, TrashCanIcon } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'
import { useState } from 'react'

import { DeleteClient } from '../actions/Delete'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnDelete = ColumnBuilder.display({
  id: 'delete',
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

  return <DeleteAction disabled={!isReady} />
}

function DeleteAction({ disabled }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip label="Delete client">
        <Button
          disabled={disabled}
          tertiary
          style={{
            padding: 0, width: 32, height: 32, minHeight: 32,
          }}
          onClick={() => setOpen(true)}
        >
          <TrashCanIcon
            color={disabled ? undefined : 'icon-danger'}
            size={16}
          />
        </Button>
      </Tooltip>

      {open && <DeleteClient onClose={() => setOpen(false)} />}
    </>
  )
}

export { ColumnDelete }
