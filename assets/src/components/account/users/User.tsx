import { useMutation } from '@apollo/client'
import { useCallback, useContext, useState } from 'react'
import { LoginContext } from 'components/contexts'
import { Chip, Switch } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { Confirm } from 'components/utils/Confirm'

import UserInfo from '../../utils/UserInfo'
import { Permissions, hasRbac } from '../misc'

import { EDIT_USER } from './queries'

export function User({ user }: any) {
  const theme = useTheme()
  const { me } = useContext(LoginContext)
  const [mutation, { loading, error }] = useMutation<any>(EDIT_USER, {
    variables: { id: user.id },
    onCompleted: () => setConfirm(false),
  })
  const editable = !!me?.roles?.admin || hasRbac(me as any, Permissions.USERS)
  const isAdmin = !!user.roles?.admin
  const setAdmin = useCallback(
    () =>
      mutation({ variables: { attributes: { roles: { admin: !isAdmin } } } }),
    [mutation, isAdmin]
  )
  const [confirm, setConfirm] = useState(false)

  const isSelf = user.id === me?.id

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
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: theme.spacing.small,
      }}
    >
      <UserInfo
        user={user}
        css={{ width: '100%' }}
      />
      {confirmModal}
      {!editable && isAdmin && <Chip>Admin</Chip>}
      {editable && (
        <Switch
          checked={isAdmin}
          disabled={loading}
          onChange={() => {
            if (isAdmin) {
              setConfirm(true)
            } else {
              setAdmin()
            }
          }}
        >
          Admin
        </Switch>
      )}
    </div>
  )
}
