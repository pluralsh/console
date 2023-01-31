import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { Switch } from 'honorable'
import { useCallback, useContext, useState } from 'react'
import { LoginContext } from 'components/contexts'

import { Confirm } from 'components/utils/Confirm'

import UserInfo from '../../utils/UserInfo'

import { Permissions, hasRbac } from '../misc'

import { EDIT_USER } from './queries'

export function User({ user }: any) {
  const { me } = useContext(LoginContext)
  const [mutation, { loading, error }] = useMutation<any>(EDIT_USER, {
    variables: { id: user.id },
    onCompleted: () => setConfirm(false),
  })
  const editable = !!me.roles?.admin || hasRbac(me, Permissions.USERS)
  const isAdmin = !!user.roles?.admin
  const setAdmin = useCallback(() => mutation({ variables: { attributes: { roles: { admin: !isAdmin } } } }),
    [mutation, isAdmin])
  const [confirm, setConfirm] = useState(false)

  const isSelf = user.id === me.id

  const confirmModal = confirm && (
    <Confirm
      open={confirm}
      title="Remove admin role"
      text={`Are you sure you want to remove ${
        isSelf ? 'yourself' : user.name
      } as admin?${isSelf ? ' This cannot be undone.' : ''}`}
      close={() => setConfirm(false)}
      submit={() => {
        setAdmin()
      }}
      loading={loading}
      destructive
      error={error}
    />
  )

  return (
    <Box
      fill="horizontal"
      direction="row"
      align="center"
    >
      <UserInfo
        fill="horizontal"
        user={user}
      />
      {confirmModal}
      {editable && (
        <Switch
          checked={isAdmin}
          disabled={loading}
          onChange={() => {
            if (isAdmin) {
              setConfirm(true)
            }
            else {
              setAdmin()
            }
          }}
        >
          Admin
        </Switch>
      )}
    </Box>
  )
}
