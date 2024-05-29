import React, { useState } from 'react'
import { Button } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import type { ApolloQueryResult } from '@apollo/client/core'

import { Confirm } from '../utils/Confirm'
import { StackFragment, useDetachStackMutation } from '../../generated/graphql'
import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'

export default function StackDetach({
  stack,
  refetch,
}: {
  stack: StackFragment
  refetch: (variables?: Partial<any>) => Promise<ApolloQueryResult<any>>
}) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)

  const [mutation, { loading, error }] = useDetachStackMutation({
    variables: { id: stack.id ?? '' },
    onCompleted: () => {
      refetch().then(() => navigate(getStacksAbsPath('')))
      setConfirm(false)
    },
  })

  return (
    <>
      <Button
        destructive
        onClick={() => setConfirm(true)}
      >
        Detach
      </Button>
      <Confirm
        open={confirm}
        title="Detach stack"
        text={`Are you sure you want to detach ${stack.name} stack?`}
        close={() => setConfirm(false)}
        submit={() => mutation()}
        label="Detach"
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}
