import { ListBoxItem, Tooltip } from '@pluralsh/design-system'
import { CellContext } from '@tanstack/react-table'
import { Div } from 'honorable'
import {
  Dispatch,
  useContext,
  useMemo,
  useState,
} from 'react'
import { ColumnDefTemplate } from '@tanstack/table-core/src/types'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import styled from 'styled-components'

import { MoreMenu } from '../../utils/MoreMenu'
import { DeleteClient } from '../actions/Delete'
import { DownloadConfig } from '../actions/Download'

import { ColumnBuilder, VPNClientRow } from './types'

const ColumnActions = refetch => ColumnBuilder.display({
  id: 'actions',
  header: '',
  enableGlobalFilter: false,
  enableSorting: false,
  meta: {
    gridTemplate: '48px',
  },
  cell: cell(refetch),
})

function cell(refetch): ColumnDefTemplate<CellContext<VPNClientRow, unknown>> {
  const context = (props: CellContext<VPNClientRow, unknown>): JSX.Element => {
    const { isReady, name } = props.row.original

    return (
      <VPNColumnActions
        disabled={!isReady}
        name={name}
        refetch={refetch}
      />
    )
  }

  return context
}

interface MenuItem {
  label: string
  disabledTooltip?: string
  onSelect: Dispatch<void>
  props?: Record<string, unknown>
}

enum MenuItemSelection {
  DownloadConfig = 'downloadConfig',
  DeleteClient = 'deleteClient',
}

type MenuItems = {[key in MenuItemSelection]: MenuItem}

const DisabledItem = styled.div(() => ({
  '&:focus, &:focus-visible': {
    outline: 'none',
    boxShadow: 'none',
  },
}))

function VPNColumnActions({ disabled, refetch, name }) {
  const { availableFeatures, isPaidPlan } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.vpn || isPaidPlan
  const [selected, setSelected] = useState<MenuItemSelection | undefined>()
  const dialog = useMemo(() => {
    switch (selected) {
    case MenuItemSelection.DownloadConfig:
      return (
        <DownloadConfig
          name={name}
          onClose={() => setSelected(undefined)}
        />
      )
    case MenuItemSelection.DeleteClient:
      return (
        <DeleteClient
          name={name}
          onClose={() => setSelected(undefined)}
          refetch={refetch}
        />
      )
    }
  }, [name, refetch, selected])

  const menuItems: MenuItems = {
    [MenuItemSelection.DownloadConfig]: {
      label: 'Download client config',
      onSelect: () => setSelected(MenuItemSelection.DownloadConfig),
    },
    [MenuItemSelection.DeleteClient]: {
      label: 'Delete VPN client',
      onSelect: () => {
        if (isAvailable) setSelected(MenuItemSelection.DeleteClient)
      },
      disabledTooltip: !isAvailable ? 'Upgrade to Plural Professional to manage VPN clients.' : undefined,
      props: {
        destructive: true,
        disabled: !isAvailable,
      },
    },
  }

  return (
    <Div
      right={0}
      marginRight="small"
    >
      <MoreMenu
        onSelectionChange={selected => menuItems[selected]?.onSelect()}
        disabled={disabled}
      >
        {Object.entries(menuItems).map(([key, { label, props = {}, disabledTooltip }]) => {
          const item = (
            <ListBoxItem
              key={key}
              textValue={label}
              label={label}
              {...props}
            />
          )

          return disabledTooltip ? (
            <DisabledItem>
              <Tooltip label={disabledTooltip}>{item}</Tooltip>
            </DisabledItem>
          ) : item
        })}
      </MoreMenu>

      {!!selected && dialog}
    </Div>
  )
}

export { ColumnActions }
