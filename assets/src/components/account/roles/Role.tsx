import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { ListBoxItem, Tooltip } from '@pluralsh/design-system'
import { Dispatch, useContext, useState } from 'react'
import { LoginContext } from 'components/contexts'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import styled from 'styled-components'

import { removeConnection, updateCache } from '../../../utils/graphql'
import { Info } from '../../utils/Info'
import RoleEdit from '../roles/RoleEdit'
import { Permissions, hasRbac } from '../misc'

import { DELETE_ROLE, ROLES_Q } from './queries'

const DisabledItem = styled.div(() => ({
  '&:focus, &:focus-visible': {
    outline: 'none',
    boxShadow: 'none',
  },
}))

interface MenuItem {
  label: string
  disabledTooltip?: string
  onSelect: Dispatch<void>
  props?: Record<string, unknown>
}

enum MenuItemSelection {
  Edit = 'edit',
  Delete = 'delete',
}

type MenuItems = {[key in MenuItemSelection]: MenuItem}

export default function Role({ role, q }: any) {
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { me } = useContext<any>(LoginContext)
  const { availableFeatures, isPaidPlan } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement || isPaidPlan
  const editable = !!me.roles?.admin || hasRbac(me, Permissions.USERS)
  const [mutation, { loading, error }] = useMutation(DELETE_ROLE, {
    variables: { id: role.id },
    update: (cache, { data }) => updateCache(cache, {
      query: ROLES_Q,
      variables: { q },
      update: prev => removeConnection(prev, data.deleteRole, 'roles'),
    }),
    onCompleted: () => setConfirm(false),
  })

  const menuItems: MenuItems = {
    [MenuItemSelection.Edit]: {
      label: 'Edit role',
      onSelect: () => setEdit(true),
      disabledTooltip: !isAvailable ? 'Upgrade to Plural Professional to manage roles.' : undefined,
      props: {
        disabled: !isAvailable,
      },
    },
    [MenuItemSelection.Delete]: {
      label: 'Delete role',
      onSelect: () => setConfirm(true),
      props: {
        destructive: true,
      },
    },
  }

  return (
    <Box
      fill="horizontal"
      direction="row"
      align="center"
    >
      <Info
        text={role.name}
        description={role.description || 'no description'}
      />
      {editable
      && (
        <MoreMenu onSelectionChange={selectedKey => menuItems[selectedKey]?.onSelect()}>
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
      )}
      <>
        <Confirm
          open={confirm}
          title="Delete role"
          text="Are you sure you want to delete this role? This could have downstream effects on a large number of users."
          close={() => setConfirm(false)}
          submit={() => mutation()}
          loading={loading}
          destructive
          error={error}
        />
        {edit && (
          <RoleEdit
            role={role}
            open={edit}
            setOpen={setEdit}
          />
        )}
      </>
    </Box>
  )
}
