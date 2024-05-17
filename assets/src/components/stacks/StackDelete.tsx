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
        disabled={stack.deletedAt}
        onClick={() => setConfirm(true)}
      >
        Delete
      </Button>
      <Confirm
        open={confirm}
        title="Delete infrastructure stack"
        text={`Are you sure you want to delete ${stack.name} infrastructure stack?`}
        close={() => setConfirm(false)}
        submit={() => mutation()}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}
