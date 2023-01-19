import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { ListBoxItem } from '@pluralsh/design-system'
import { useContext, useState } from 'react'

import { LoginContext } from 'components/contexts'

import { Confirm } from 'components/utils/Confirm'

import { MoreMenu } from 'components/utils/MoreMenu'

import { removeConnection, updateCache } from '../../../utils/graphql'

import { Info } from '../../utils/Info'
import RoleEdit from '../roles/RoleEdit'

import { Permissions, hasRbac } from '../misc'

import { DELETE_ROLE, ROLES_Q } from './queries'

export default function Role({ role, q }: any) {
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { me } = useContext<any>(LoginContext)
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

  const menuItems = editable ? {
    edit: {
      label: 'Edit role',
      onSelect: () => setEdit(true),
    },
    delete: {
      label: 'Delete role',
      onSelect: () => setConfirm(true),
      destructive: true,
    },
  } : {}

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
      <MoreMenu onSelectionChange={selectedKey => menuItems[selectedKey]?.onSelect()}>
        {Object.entries(menuItems).map(([key, { label, destructive }]) => (
          <ListBoxItem
            key={key}
            textValue={label}
            label={label}
            destructive={destructive}
            color="blue"
          />
        ))}
      </MoreMenu>
      <>
        <Confirm
          open={confirm}
          title="Delete role"
          text="Are you sure? Deleting roles cannot be undone."
          close={() => setConfirm(false)}
          submit={() => mutation()}
          loading={loading}
          destructive
          error={error}
        />
        <RoleEdit
          role={role}
          open={edit}
          setOpen={setEdit}
        />
      </>
    </Box>
  )
}
