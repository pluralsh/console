import React, { useCallback, useState } from 'react'

import { Button, Switch } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { useNavigate } from 'react-router-dom'

import { Confirm } from '../utils/Confirm'
import {
  StackFragment,
  useDeleteStackMutation,
  useDetachStackMutation,
} from '../../generated/graphql'
import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'

export default function StackDelete({
  stack,
  refetch,
}: {
  stack: StackFragment
  refetch?: Nullable<() => void>
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [detach, setDetach] = useState(false)

  const [deleteMutation, { loading: deleting, error: deleteError }] =
    useDeleteStackMutation()
  const [detachMutation, { loading: detaching, error: detachError }] =
    useDetachStackMutation()

  const submit = useCallback(() => {
    const baseOptions = {
      variables: { id: stack.id ?? '' },
      onCompleted: () => {
        refetch?.()
        setConfirm(false)
        if (detach) navigate(getStacksAbsPath(''))
      },
    }

    if (detach) detachMutation(baseOptions)
    else deleteMutation(baseOptions)
  }, [deleteMutation, detach, detachMutation, refetch, stack.id])

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
        submit={submit}
        extraContent={
          <Switch
            checked={detach}
            onChange={(d) => setDetach(d)}
            css={{ marginTop: theme.spacing.medium }}
          >
            Detach stack instead of deleting it completely
          </Switch>
        }
        label={detach ? 'Detach' : 'Delete'}
        loading={detach ? detaching : deleting}
        destructive
        error={detach ? detachError : deleteError}
      />
    </>
  )
}
