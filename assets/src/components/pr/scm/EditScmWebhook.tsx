import { type ComponentProps, useCallback } from 'react'
import {
  Accordion,
  Button,
  FormField,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import Input2 from '@pluralsh/design-system/dist/components/Input2'
import { useTheme } from 'styled-components'
import pick from 'lodash/pick'

import {
  ScmType,
  ScmWebhookAttributes,
  ScmWebhookFragment,
  useUpdateScmWebhookMutation,
} from 'generated/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'

import { ApolloError } from '@apollo/client'

import { scmTypeToIcon, scmTypeToLabel } from './PrScmWebhooksColumns'

function EditScmWebhookModalBase({
  open,
  onClose,
  scmWebhook,
}: {
  open: boolean
  onClose: Nullable<() => void>
  scmWebhook: ScmWebhookFragment
}) {
  const theme = useTheme()
  const {
    state: formState,
    update: updateFormState,
    hasUpdates,
  } = useUpdateState<Partial<ScmWebhookAttributes>>(
    pick(scmWebhook, [
      'apiUrl',
      'baseUrl',
      'name',
      'signingPrivateKey',
      'token',
      'type',
      'username',
    ])
  )

  const [mutation, { loading, error }] = useUpdateScmWebhookMutation({
    onCompleted: () => {
      onClose?.()
    },
  })
  const { name, type } = formState
  const allowSubmit = name && type && hasUpdates
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      if (allowSubmit) {
        const attributes = {
          name,
          type,
          apiUrl: formState.apiUrl || '',
          baseUrl: formState.baseUrl || '',
          username: formState.username || '',
          ...(!formState.token ? {} : { token: formState.token }),
          ...(!formState.signingPrivateKey
            ? {}
            : { signingPrivateKey: formState.signingPrivateKey }),
        }

        mutation({ variables: { id: scmWebhook.id, attributes } })
      }
    },
    [allowSubmit, formState, mutation, name, scmWebhook.id, type]
  )

  return (
    <Modal
      portal
      open={open}
      onClose={onClose || undefined}
      asForm
      onSubmit={onSubmit}
      header={`Update connection - ${scmWebhook.name}`}
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
            Update
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
        {...{ type: 'update', formState, updateFormState, error }}
      />
    </Modal>
  )
}

export function ScmWebhookForm({
  type,
  formState,
  updateFormState,
  error,
}: {
  type: 'update' | 'create'
  formState: Partial<ScmWebhookAttributes>
  updateFormState: (update: Partial<ScmWebhookAttributes>) => void
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
        label="Provider type"
        required
      >
        <Select
          selectedKey={formState.type}
          leftContent={
            !formState.type ? undefined : scmTypeToIcon[formState.type || '']
          }
          label="Select provider type"
          onSelectionChange={(key) => updateFormState({ type: key as ScmType })}
        >
          {[ScmType.Github, ScmType.Gitlab].map((type) => (
            <ListBoxItem
              key={type}
              leftContent={scmTypeToIcon[type]}
              label={scmTypeToLabel[type]}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        label="Name"
        required
      >
        <Input2
          value={formState.name}
          onChange={(e) => updateFormState({ name: e.target.value })}
        />
      </FormField>
      <FormField
        label="Token"
        required={type === 'create'}
      >
        <InputRevealer
          defaultRevealed={false}
          value={formState.token || ''}
          onChange={(e) => updateFormState({ token: e.target.value })}
        />
      </FormField>
      <Accordion label="Advanced configuration">
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          <FormField label="Base url">
            <Input2
              value={formState.baseUrl ?? ''}
              onChange={(e) => updateFormState({ baseUrl: e.target.value })}
            />
          </FormField>
          <FormField label="API url">
            <Input2
              value={formState.apiUrl ?? ''}
              onChange={(e) => updateFormState({ apiUrl: e.target.value })}
            />
          </FormField>
          <FormField label="User name">
            <Input2
              value={formState.username ?? ''}
              onChange={(e) => updateFormState({ username: e.target.value })}
            />
          </FormField>
          <FormField label="Signing private key">
            <InputRevealer
              defaultRevealed={false}
              value={formState.signingPrivateKey ?? ''}
              onChange={(e) =>
                updateFormState({ signingPrivateKey: e.target.value })
              }
            />
          </FormField>
        </div>
      </Accordion>
      {error && <GqlError error={error} />}
    </div>
  )
}

export function EditScmWebhookModal(
  props: ComponentProps<typeof EditScmWebhookModalBase>
) {
  return (
    <ModalMountTransition open={props.open}>
      <EditScmWebhookModalBase {...props} />
    </ModalMountTransition>
  )
}
