import { useCallback, useState } from 'react'
import { Button, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  ScmWebhooksDocument,
  useCreateScmWebhookMutation,
} from 'generated/graphql'
import { appendConnection, updateCache } from 'utils/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { ScmWebhookForm } from './EditScmWebhook'
import { SCM_WEBHOOKS_Q_VARS } from './PrScmWebhooks'

export function CreateScmWebhookModal({
  connectionId,
  refetch,
  open,
  onClose,
}: {
  connectionId: string
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const { state: formState, update: updateFormState } = useUpdateState<{
    owner: string
  }>({ owner: '' })

  const [mutation, { loading, error }] = useCreateScmWebhookMutation({
    update: (cache, { data }) =>
      updateCache(cache, {
        variables: SCM_WEBHOOKS_Q_VARS,
        query: ScmWebhooksDocument,
        update: (prev) =>
          appendConnection(prev, data?.createScmWebhook, 'scmWebhooks'),
      }),
    onCompleted: () => {
      onClose?.()
      refetch?.()
    },
  })
  const { owner } = formState
  const allowSubmit = owner && connectionId
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      if (allowSubmit) {
        mutation({ variables: { connectionId, owner } })
      }
    },
    [allowSubmit, connectionId, mutation, owner]
  )

  return (
    <Modal
      portal
      open={open}
      onClose={onClose || undefined}
      asForm
      onSubmit={onSubmit}
      header="Create a new connection"
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.small,
          }}
        >
          <Button
            loading={loading}
            primary
            disabled={!allowSubmit}
            type="submit"
          >
            Create
          </Button>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <ScmWebhookForm
        {...{ type: 'create', formState, updateFormState, error }}
      />
    </Modal>
  )
}

export function CreateScmWebhook({
  refetch,
}: {
  refetch: Nullable<() => void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => setOpen(true)}
      >
        Create connection
      </Button>
      <ModalMountTransition open={open}>
        <CreateScmWebhookModal
          open={open}
          refetch={refetch}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
