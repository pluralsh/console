import { useCallback, useState } from 'react'
import { Button, FormField, Input2,Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ApolloError } from '@apollo/client'

import {
  ScmConnectionFragment,
  ScmType,
  ScmWebhooksDocument,
  useCreateScmWebhookMutation,
} from 'generated/graphql'
import { appendConnection, updateCache } from 'utils/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'


import { GqlError } from 'components/utils/Alert'


import { SCM_WEBHOOKS_Q_VARS } from './ScmWebhooks'
import { scmTypeToLabel } from './PrScmConnectionsColumns'

export function CreateScmWebhookModal({
  connection,
  open,
  onClose,
}: {
  connection: ScmConnectionFragment
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
    },
  })
  const { owner } = formState
  const allowSubmit = owner && connection?.id
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      if (allowSubmit) {
        mutation({ variables: { connectionId: connection?.id, owner } })
      }
    },
    [allowSubmit, connection, mutation, owner]
  )

  return (
    <Modal
      portal
      open={open}
      onClose={onClose || undefined}
      asForm
      onSubmit={onSubmit}
      header={`Create a new ${
        scmTypeToLabel[connection.type || ''] || 'SCM'
      } webhook for ${connection.name}`}
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
        {...{ type: 'create', connection, formState, updateFormState, error }}
      />
    </Modal>
  )
}

export function CreateScmWebhook({
  connection,
}: {
  connection: ScmConnectionFragment
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        onClick={() => setOpen(true)}
      >
        Create webhook
      </Button>
      <ModalMountTransition open={open}>
        <CreateScmWebhookModal
          connection={connection}
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}

type ScmWebhookVars = {
  owner: string
}

export function ScmWebhookForm({
  connection,
  formState,
  updateFormState,
  error,
}: {
  connection: Nullable<ScmConnectionFragment>
  formState: Partial<ScmWebhookVars>
  updateFormState: (update: Partial<ScmWebhookVars>) => void
  error: ApolloError | undefined
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      <FormField
        label={
          connection?.type === ScmType.Github
            ? (`${scmTypeToLabel[connection.type]} organization` as const)
            : connection?.type === ScmType.Gitlab
            ? (`${scmTypeToLabel[connection.type]} group` as const)
            : 'Owner'
        }
        required
      >
        <Input2
          value={formState.owner}
          onChange={(e) => updateFormState({ owner: e.target.value })}
        />
      </FormField>

      {error && <GqlError error={error} />}
    </div>
  )
}
