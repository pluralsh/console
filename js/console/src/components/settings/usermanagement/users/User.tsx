import { Chip, Switch } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { Confirm } from 'components/utils/Confirm'
import { UserFragment, useUpdateUserMutation } from 'generated/graphql'
import { useCallback, useState } from 'react'
import styled from 'styled-components'

export function UserAdminCell({ user }: { user: UserFragment }) {
  const { me } = useLogin()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useUpdateUserMutation({
    onCompleted: () => setConfirm(false),
  })
  const editable = !!me?.roles?.admin
  const isAdmin = !!user.roles?.admin
  const isSelf = user.id === me?.id
  const setAdmin = useCallback(
    () =>
      mutation({
        variables: { id: user.id, attributes: { roles: { admin: !isAdmin } } },
      }),
    [mutation, user.id, isAdmin]
  )

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
          submit={setAdmin}
          loading={loading}
          destructive
          error={error}
        />
      )}
      {!editable && isAdmin && <Chip>Admin</Chip>}
      {editable && (
        <AdminSwitchSC
          aria-label="Admin"
          checked={isAdmin}
          disabled={loading}
          onChange={() => {
            if (isAdmin) {
              setConfirm(true)
            } else {
              setAdmin()
            }
          }}
        />
      )}
    </div>
  )
}

const AdminSwitchSC = styled(Switch)({
  columnGap: 0,
  '.label': { display: 'none' },
})
