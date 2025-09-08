import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Confirm } from 'components/utils/Confirm'
import UserInfo from 'components/utils/UserInfo'
import { useDeleteUserMutation, UserFragment } from 'generated/graphql.ts'
import { useState } from 'react'

const columnHelper = createColumnHelper<UserFragment>()

const ColInfo = columnHelper.accessor((user) => user, {
  id: 'info',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    return <UserInfo user={getValue()} />
  },
})

const ColActions = columnHelper.accessor((user) => user, {
  id: 'actions',
  cell: function Cell({ table, getValue }) {
    const user = getValue()
    const isAdmin = !!table.options.meta?.isAdmin
    const [confirmOpen, setConfirmOpen] = useState(false)

    const [mutation, { loading, error }] = useDeleteUserMutation({
      variables: { id: user.id },
      onCompleted: () => setConfirmOpen(false),
      refetchQueries: ['ServiceAccounts'],
      awaitRefetchQueries: true,
    })

    if (!isAdmin) return null

    return (
      <>
        <IconFrame
          clickable
          icon={<TrashCanIcon color="icon-danger" />}
          onClick={() => setConfirmOpen(true)}
          tooltip="Delete"
        />
        <Confirm
          open={confirmOpen}
          loading={loading}
          error={error}
          close={() => setConfirmOpen(false)}
          destructive
          label="Delete service account"
          title="Delete service account"
          submit={() => mutation()}
          text={`Are you sure you want to delete the "${user.email}" service account?`}
        />
      </>
    )
  },
})

export const serviceAccountsCols = [ColInfo, ColActions]
