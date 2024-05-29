import React, { useState } from 'react'
import { Button } from '@pluralsh/design-system'

import { Confirm } from '../utils/Confirm'
import { StackFragment, useDeleteStackMutation } from '../../generated/graphql'

export default function StackDelete({
  stack,
  refetch,
}: {
  stack: StackFragment
  refetch?: Nullable<() => void>
}) {
  const deleting = !!stack.deletedAt
  const [confirm, setConfirm] = useState(false)

  const [mutation, { loading, error }] = useDeleteStackMutation({
    variables: { id: stack.id ?? '' },
    onCompleted: () => {
      refetch?.()
      setConfirm(false)
    },
  })

  return (
    <>
      <Button
        destructive
        onClick={() => setConfirm(true)}
      >
        {deleting ? 'Retry delete' : 'Delete'}
      </Button>
      <Confirm
        open={confirm}
        title={`${deleting ? 'Retry delete' : 'Delete'} stack`}
        text={`Are you sure you want to ${deleting ? 'retry' : ''} delete ${
          stack.name
        } stack?`}
        close={() => setConfirm(false)}
        submit={() => mutation()}
        label={deleting ? 'Retry delete' : 'Delete'}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}
