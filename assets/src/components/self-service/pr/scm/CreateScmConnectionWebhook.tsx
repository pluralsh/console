import { ComponentProps, useCallback, useState } from 'react'
import { Button, FormField, Input2, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'

import {
  ScmConnectionFragment,
  ScmType,
  ScmWebhooksDocument,
  useCreateScmWebhookMutation,
} from 'generated/graphql'
import { appendConnectionToEnd, updateCache } from 'utils/graphql'

import { PR_SCM_WEBHOOKS_ABS_PATH } from 'routes/selfServiceRoutesConsts'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'
import { Body1P } from 'components/utils/typography/Text'

import { scmTypeToLabel } from './PrScmConnectionsColumns'

export function CreateScmConectionWebhookModalBase({
  connection,
  open,
  onClose,
}: {
  connection: ScmConnectionFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)
  const { state: formState, update: updateFormState } = useUpdateState<{
    owner: string
  }>({ owner: '' })

  const [mutation, { loading, error }] = useCreateScmWebhookMutation({
    update: (cache, { data }) =>
      updateCache(cache, {
        variables: { first: 100 },
        query: ScmWebhooksDocument,
        update: (prev) =>
          appendConnectionToEnd(prev, data?.createScmWebhook, 'scmWebhooks'),
      }),
    onCompleted: () => {
      setSuccess(true)
    },
  })
  const { owner } = formState
  const allowSubmit = owner && connection?.id
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (success) {
        navigate(PR_SCM_WEBHOOKS_ABS_PATH)

        return
      }
      if (allowSubmit) {
        mutation({
          variables: { connectionId: connection?.id, owner: owner.trim() },
        })
      }
    },
    [allowSubmit, connection?.id, mutation, navigate, owner, success]
  )

  return (
    <Modal
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
          {success ? (
            <Button
              loading={loading}
              primary
              disabled={!allowSubmit}
              type="submit"
            >
              View webhooks
            </Button>
          ) : (
            <Button
              loading={loading}
              primary
              disabled={!allowSubmit}
              type="submit"
            >
              Create
            </Button>
          )}
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            {success ? 'Close' : 'Cancel'}
          </Button>
        </div>
      }
    >
      {success ? (
        <Body1P>Successfully created webhook for {connection.name}</Body1P>
      ) : (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          <ScmConnectionWebhookForm
            {...{
              type: 'create',
              connection,
              formState,
              updateFormState,
              error,
            }}
          />
          {error && <GqlError error={error} />}
        </div>
      )}
    </Modal>
  )
}

export function CreateScmConnectionWebhookModal(
  props: ComponentProps<typeof CreateScmConectionWebhookModalBase>
) {
  return (
    <ModalMountTransition open={props.open}>
      <CreateScmConectionWebhookModalBase {...props} />
    </ModalMountTransition>
  )
}

type ScmWebhookVars = {
  owner: string
}

export function ScmConnectionWebhookForm({
  connection,
  formState,
  updateFormState,
}: {
  connection: Nullable<ScmConnectionFragment>
  formState: Partial<ScmWebhookVars>
  updateFormState: (update: Partial<ScmWebhookVars>) => void
}) {
  return (
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
  )
}
