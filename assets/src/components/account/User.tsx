import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { Span, Switch } from 'honorable'
import { AppIcon } from '@pluralsh/design-system'
import { useCallback, useContext } from 'react'
import { LoginContext } from 'components/contexts'

import { EDIT_USER } from './queries'

export function UserInfo({ user: { email, name, avatar }, hue = 'lighter', ...box }: any) {
  return (
    <Box
      {...box}
      direction="row"
      gap="small"
      align="center"
    >
      <AppIcon
        url={avatar}
        name={name}
        spacing={avatar ? 'none' : undefined}
        size="xsmall"
        hue={hue}
      />
      <Box>
        <Span fontWeight="bold">{name}</Span>
        <Span color="text-light">{email}</Span>
      </Box>
    </Box>
  )
}

// TODO: Test.
export function User({ user }: any) {
  const { me } = useContext(LoginContext)
  const [mutation, { loading }] = useMutation<any>(EDIT_USER, { variables: { id: user.id } })
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
      {!!me.roles?.admin && (
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
