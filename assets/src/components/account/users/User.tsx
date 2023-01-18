import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { Switch } from 'honorable'
import { useCallback, useContext } from 'react'
import { LoginContext } from 'components/contexts'

import UserInfo from '../../utils/UserInfo'

import { Permissions, hasRbac } from '../misc'

import { EDIT_USER } from './queries'

export function User({ user }: any) {
  const { me } = useContext(LoginContext)
  const [mutation, { loading }] = useMutation<any>(EDIT_USER, { variables: { id: user.id } })
  const editable = !!me.roles?.admin || hasRbac(me, Permissions.USERS)
  const isAdmin = !!user.roles?.admin
  const setAdmin = useCallback(() => mutation({ variables: { attributes: { roles: { admin: !isAdmin } } } }), [mutation, isAdmin])

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
      {editable && (
        <Switch
          defaultChecked={isAdmin}
          disabled={loading}
          onChange={() => setAdmin()}
        >
          Admin
        </Switch>
      )}
    </Box>
  )
}
