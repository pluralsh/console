import React, { useCallback, useState } from 'react'

import { Button, Switch } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { useNavigate } from 'react-router-dom'

import { Confirm } from '../../utils/Confirm'
import {
  StackFragment,
  useDeleteStackMutation,
  useDetachStackMutation,
} from '../../../generated/graphql'
import { getStacksAbsPath } from '../../../routes/stacksRoutesConsts'

export default function DeleteStack({
  stack,
  refetch,
}: {
  stack: StackFragment
  refetch?: Nullable<() => void>
}) {
  const deleting = !!stack.deletedAt
  const theme = useTheme()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [detach, setDetach] = useState(deleting)

  const [deleteMutation, { loading: deleteLoading, error: deleteError }] =
    useDeleteStackMutation()
  const [detachMutation, { loading: detachLoading, error: detachError }] =
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
  }, [deleteMutation, detach, detachMutation, navigate, refetch, stack.id])

  return (
    <>
      <Button
        destructive
        onClick={() => setConfirm(true)}
      >
        {deleting ? 'Detach stack' : 'Delete stack'}
      </Button>
      <Confirm
        open={confirm}
        title={`${detach ? 'Detach' : 'Delete'} infrastructure stack`}
        text={`Are you sure you want to ${detach ? 'detach' : 'delete'} ${
          stack.name
        } infrastructure stack?`}
        close={() => setConfirm(false)}
        submit={submit}
        extraContent={
          deleting ? undefined : (
            <Switch
              checked={detach}
              onChange={(d) => setDetach(d)}
              css={{ marginTop: theme.spacing.medium }}
            >
              Detach stack instead of destroying it completely
            </Switch>
          )
        }
        label={detach ? 'Detach' : 'Delete'}
        loading={detach ? detachLoading : deleteLoading}
        destructive
        error={detach ? detachError : deleteError}
      />
    </>
  )
}
