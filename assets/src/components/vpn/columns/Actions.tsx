import { ListBoxItem } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'
import { Div } from 'honorable'
import { Dispatch, useMemo, useState } from 'react'

import { MoreMenu } from '../../utils/MoreMenu'
import { DeleteClient } from '../actions/Delete'
import { DownloadConfig } from '../actions/Download'

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

function cell(props: CellContext<VPNClientRow, unknown>): JSX.Element {
  const { isReady } = props.row.original

  return <VPNColumnActions disabled={!isReady} />
}

interface MenuItem {
  label: string
  onSelect: Dispatch<void>
  props?: Record<string, unknown>
}

enum MenuItemSelection {
  DownloadConfig = 'downloadConfig',
  DeleteClient = 'deleteClient',
}

type MenuItems = {[key in MenuItemSelection]: MenuItem}

function VPNColumnActions({ disabled }) {
  const [selected, setSelected] = useState<MenuItemSelection | undefined>()
  const dialog = useMemo(() => {
    switch (selected) {
    case MenuItemSelection.DownloadConfig:
      return <DownloadConfig onClose={() => setSelected(undefined)} />
    case MenuItemSelection.DeleteClient:
      return <DeleteClient onClose={() => setSelected(undefined)} />
    }
  }, [selected])

  const menuItems: MenuItems = {
    [MenuItemSelection.DownloadConfig]: {
      label: 'Download client config',
      onSelect: () => setSelected(MenuItemSelection.DownloadConfig),
    },
    [MenuItemSelection.DeleteClient]: {
      label: 'Delete VPN client',
      onSelect: () => setSelected(MenuItemSelection.DeleteClient),
      props: {
        destructive: true,
      },
    },
  }

  return (
    <Div
      position="absolute"
      right={0}
      marginRight="small"
    >
      <MoreMenu
        onSelectionChange={selected => menuItems[selected]?.onSelect()}
        disabled={disabled}
      >
        {Object.entries(menuItems).map(([key, { label, props = {} }]) => (
          <ListBoxItem
            key={key}
            textValue={label}
            label={label}
            {...props}
          />
        ))}
      </MoreMenu>

      {!!selected && dialog}
    </Div>
  )
}

export { ColumnActions }
