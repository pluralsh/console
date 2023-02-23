import styled from 'styled-components'
import {
  Dispatch,
  Key,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AppIcon,
  Button,
  ListBoxFooter,
  ListBoxItem,
  PeopleIcon,
  Select,
} from '@pluralsh/design-system'

import { CreateClient } from '../../vpn/actions/Create'
import { User } from '../../../generated/graphql'

const SelectAllFooterButton = styled(SelectAllFooterButtonUnstyled)(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-primary-accent'],
}))

function SelectAllFooterButtonUnstyled({ onClick, ...props }) {
  return (
    <ListBoxFooter
      onClick={onClick}
      leftContent={(
        <PeopleIcon
          color="text-primary-accent"
          size={16}
        />
      )}
      {...props}
    >Select All
    </ListBoxFooter>
  )
}

const HeaderActions = styled(HeaderActionsUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.medium,

  '.selectWrapper': {
    maxWidth: 240,
    width: 240,

    ' .children': {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  },
}))

interface HeaderActionsProps {
  users: Array<User>
  refetch: Dispatch<any>
  onFilter: Dispatch<Set<Key>>
}

function HeaderActionsUnstyled({
  users, refetch, onFilter, ...props
}: HeaderActionsProps) {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(new Set<Key>())
  const userItems = useMemo(() => users.map(user => ({
    key: user.id,
    label: user.name,
    description: user.email,
    portrait: <AppIcon
      key={user?.id}
      name={user?.name}
      url={user?.profile ?? ''}
      spacing={user?.profile ? 'none' : undefined}
      size="xxsmall"
    />,
  })), [users])

  useEffect(() => onFilter(selectedKeys), [selectedKeys])

  return (
    <div {...props}>
      <div className="selectWrapper">
        <Select
          label="All users"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          isOpen={open}
          onOpenChange={open => setOpen(open)}
          onSelectionChange={selectedKeys => setSelectedKeys(selectedKeys)}
          dropdownFooterFixed={(
            <SelectAllFooterButton onClick={() => {
              setOpen(false)
              setSelectedKeys(new Set<Key>())
            }}
            />
          )}
        >
          {userItems.map(user => (
            <ListBoxItem
              key={user.key}
              label={user.label}
              textValue={user.label}
              leftContent={user.portrait}
            />
          ))}
        </Select>
      </div>

      <Button
        secondary
        onClick={() => setVisible(true)}
      >Create VPN client
      </Button>

      {/* Modals */}
      {visible && (
        <CreateClient
          onClose={() => setVisible(false)}
          refetch={refetch}
        />
      )}
    </div>
  )
}

export { HeaderActions as VPNHeaderActions }
