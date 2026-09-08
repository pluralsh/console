import { useCallback, useContext, useState } from 'react'
import { LoginContext } from 'components/contexts'
import { Chip, Switch } from '@pluralsh/design-system'

import { Confirm } from 'components/utils/Confirm'

import { useUpdateUserMutation } from '../../../../generated/graphql.ts'

export type UsersTableUser = {
  id: string
  name: string
  email: string
  profile?: string | null
  roles?: { admin?: boolean | null } | null
  groups?: Nullable<
    Array<
      Nullable<{
        id: string
        name: string
        description?: string | null
      }>
    >
  >
}

export function UserAdminCell({ user }: { user: UsersTableUser }) {
  const { me } = useContext(LoginContext)
  const [mutation, { loading, error }] = useUpdateUserMutation({
    onCompleted: () => setConfirm(false),
  })
  const editable = !!me?.roles?.admin
  const isAdmin = !!user.roles?.admin
  const setAdmin = useCallback(
    () =>
      mutation({
        variables: { id: user.id, attributes: { roles: { admin: !isAdmin } } },
      }),
    [mutation, user.id, isAdmin]
  )
  const [confirm, setConfirm] = useState(false)

  const isSelf = user.id === me?.id

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {confirm && (
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
      )}
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
