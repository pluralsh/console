import { Button, Tooltip, TrashCanIcon } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'
import { Dispatch, useState } from 'react'

import { ColumnDefTemplate } from '@tanstack/table-core/src/types'

import { DeleteClient } from '../actions/Delete'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnDelete = refetch => ColumnBuilder.display({
  id: 'delete',
  header: '',
  enableGlobalFilter: false,
  enableSorting: false,
  meta: {
    center: true,
    gridTemplate: '48px',
  },
  cell: cell(refetch),
})

function cell(refetch): ColumnDefTemplate<CellContext<VPNClientRow, unknown>> {
  const context = (props: CellContext<VPNClientRow, unknown>): JSX.Element => {
    const { isReady, name } = props.row.original

    return (
      <DeleteAction
        disabled={!isReady}
        name={name ?? ''}
        refetch={refetch}

      />
    )
  }

  return context
}

interface DeleteActionsProps {
  disabled: boolean,
  name: string
  refetch: Dispatch<void>
}

function DeleteAction({ disabled, name, refetch }: DeleteActionsProps) {
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

      {open && (
        <DeleteClient
          onClose={() => setOpen(false)}
          name={name}
          refetch={refetch}
        />
      )}
    </>
  )
}

export { ColumnDelete }
