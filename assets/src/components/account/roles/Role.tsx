import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { ListBoxItem } from '@pluralsh/design-system'
import { useContext, useState } from 'react'

import { LoginContext } from 'components/contexts'

import { Confirm } from 'components/utils/Confirm'

import { MoreMenu } from 'components/utils/MoreMenu'

import { removeConnection, updateCache } from '../../../utils/graphql'

import { DELETE_ROLE, ROLES_Q } from '../queries'

import { Info } from '../Info'
import RoleEdit from '../roles/RoleEdit'

export default function Role({ role, q }: any) {
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { me } = useContext<any>(LoginContext)
  const editable = !!me.roles?.admin
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
        {Object.entries(menuItems).map(([key, { label }]) => (
          <ListBoxItem
            key={key}
            textValue={label}
            label={label}
            color="blue"
          />
        ))}
      </MoreMenu>
      <>
        <Confirm
          open={confirm}
          text="Deleting roles cannot be undone."
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
