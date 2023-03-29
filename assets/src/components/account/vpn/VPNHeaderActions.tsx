import styled from 'styled-components'
import { Dispatch, Key, useContext, useEffect, useMemo, useState } from 'react'
import {
  AppIcon,
  Button,
  ListBoxFooter,
  ListBoxItem,
  PeopleIcon,
  Select,
} from '@pluralsh/design-system'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import BillingFeatureBlockModal from 'components/billing/BillingFeatureBlockModal'

import { CreateClient } from '../../vpn/actions/Create'
import { User } from '../../../generated/graphql'

const SelectAllFooterButton = styled(SelectAllFooterButtonUnstyled)(
  ({ theme }) => ({
    ...theme.partials.text.body2,
    color: theme.colors['text-primary-accent'],
  })
)

function SelectAllFooterButtonUnstyled({ onClick, ...props }) {
  return (
    <ListBoxFooter
      onClick={onClick}
      leftContent={
        <PeopleIcon
          color="text-primary-accent"
          size={16}
        />
      }
      {...props}
    >
      Select All
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
  users,
  refetch,
  onFilter,
  ...props
}: HeaderActionsProps) {
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.vpn
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [blockModalVisible, setBlockModalVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(new Set<Key>())
  const userItems = useMemo(
    () =>
      users.map((user) => ({
        key: user.id,
        label: user.name,
        description: user.email,
        portrait: (
          <AppIcon
            key={user?.id}
            name={user?.name}
            url={user?.profile ?? ''}
            spacing={user?.profile ? 'none' : undefined}
            size="xxsmall"
          />
        ),
      })),
    [users]
  )

  useEffect(() => onFilter(selectedKeys), [onFilter, selectedKeys])

  return (
    <div {...props}>
      <div className="selectWrapper">
        <Select
          isDisabled={!isAvailable}
          label="All users"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          isOpen={open}
          onOpenChange={(open) => setOpen(open)}
          onSelectionChange={(selectedKeys) => setSelectedKeys(selectedKeys)}
          dropdownFooterFixed={
            <SelectAllFooterButton
              onClick={() => {
                setOpen(false)
                setSelectedKeys(new Set<Key>())
              }}
            />
          }
        >
          {userItems.map((user) => (
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
        onClick={() =>
          isAvailable ? setCreateModalVisible(true) : setBlockModalVisible(true)
        }
      >
        Create VPN client
      </Button>

      {/* Modals */}
      {createModalVisible && (
        <CreateClient
          onClose={() => setCreateModalVisible(false)}
          refetch={refetch}
        />
      )}
      <BillingFeatureBlockModal
        open={blockModalVisible}
        message="Upgrade to Plural Professional to create a VPN client."
        onClose={() => setBlockModalVisible(false)}
      />
    </div>
  )
}

export { HeaderActions as VPNHeaderActions }
