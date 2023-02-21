import { Tooltip } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'

import { Div } from 'honorable'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnPublicKey = ColumnBuilder.accessor(row => row.publicKey, {
  id: 'publicKey',
  header: 'Public key',
  enableGlobalFilter: true,
  enableSorting: true,
  meta: {
    truncate: true,
  },
  cell,
})

function cell(props: CellContext<VPNClientRow, string | undefined>): JSX.Element {
  const publicKey = props.getValue()

  return (
    <Tooltip
      label={publicKey}
      placement="top-start"
    >
      <div>{publicKey}</div>
    </Tooltip>
  )
}

export { ColumnPublicKey }
