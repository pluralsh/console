import { ListBoxItem } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'
import { Div } from 'honorable'

import { MoreMenu } from '../../utils/MoreMenu'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnActions = ColumnBuilder.display({
  id: 'actions',
  header: '',
  enableGlobalFilter: false,
  enableSorting: false,
  meta: {
    gridTemplate: '48px',
  },
  cell,
})

function cell(_props: CellContext<VPNClientRow, unknown>): JSX.Element {
  // const row = props.row.original

  return (
    <Div
      position="absolute"
      right={0}
      marginRight="small"
    >
      <MoreMenu>
        <ListBoxItem
          key="change"
          textValue="Change user"
          label="Change user"
        />

        <ListBoxItem
          key="download"
          textValue="Download client config"
          label="Download client config"
        />

        <ListBoxItem
          key="delete"
          textValue="Delete VPN client"
          label="Delete VPN client"
          destructive
        />
      </MoreMenu>
    </Div>
  )
}

export { ColumnActions }
