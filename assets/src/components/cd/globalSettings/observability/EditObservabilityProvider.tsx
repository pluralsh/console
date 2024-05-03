import { type ComponentProps, useCallback } from 'react'
import { Button, FormField, Modal } from '@pluralsh/design-system'
import Input2 from '@pluralsh/design-system/dist/components/Input2'
import { useTheme } from 'styled-components'

import {
  ObservabilityProviderAttributes,
  ObservabilityProviderCredentialsAttributes,
  ObservabilityProviderFragment,
  ObservabilityProviderType,
  useUpsertObservabilityProviderMutation,
} from 'generated/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'

import { ApolloError } from '@apollo/client'

import ObservabilityProviderSelect from './ObservabilityProviderSelect'

function EditObservabilityProviderModalBase({
  open,
  onClose,
  observabilityProvider,
}: {
  open: boolean
  onClose: Nullable<() => void>
  observabilityProvider?: ObservabilityProviderFragment
}) {
  const theme = useTheme()
  const {
    state: formState,
    update: updateFormState,
    hasUpdates,
  } = useUpdateState({
    name: observabilityProvider?.name || '',
    type: observabilityProvider?.type || ObservabilityProviderType.Datadog,
    credentials: {
      datadog: { apiKey: '', appKey: '' },
    } as ObservabilityProviderCredentialsAttributes,
  })

  const [mutation, { loading, error }] = useUpsertObservabilityProviderMutation(
    {
      onCompleted: () => {
        onClose?.()
      },
    }
  )
  const { name, type } = formState
  const allowSubmit = name && type && hasUpdates
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      if (allowSubmit) {
        const attributes = {
          name,
          type,
          credentials: formState.credentials,
        }

        mutation({ variables: { attributes } })
      }
    },
    [allowSubmit, mutation, name, type, formState.credentials]
  )

  return (
    <Modal
      portal
      open={open}
      onClose={onClose || undefined}
      asForm
      onSubmit={onSubmit}
      header={
        observabilityProvider?.name
          ? `Update provider - ${observabilityProvider.name}`
          : 'New provider'
      }
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
      <ObservabilityProviderForm
        type="update"
        formState={formState}
        updateFormState={updateFormState}
        error={error}
      />
    </Modal>
  )
}

export function ObservabilityProviderForm({
  type,
  formState,
  updateFormState,
  error,
}: {
  type: 'update' | 'create'
  formState: Partial<ObservabilityProviderAttributes>
  updateFormState: (update: Partial<ObservabilityProviderAttributes>) => void
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
      <ObservabilityProviderSelect
        selectedKey={formState.type}
        updateSelectedKey={(type) => updateFormState({ type })}
      />
      <FormField
        label="Name"
        required
      >
        <Input2
          value={formState.name}
          onChange={(e) => updateFormState({ name: e.target.value })}
        />
      </FormField>
      {type === 'create' && (
        <FormField
          label="Api Key"
          required
        >
          <InputRevealer
            defaultRevealed={false}
            value={formState.credentials?.datadog?.apiKey || ''}
            onChange={(e) =>
              updateFormState({
                credentials: {
                  datadog: {
                    apiKey: e.target.value,
                    appKey: formState.credentials?.datadog?.appKey || '',
                  },
                },
              })
            }
          />
        </FormField>
      )}

      {error && <GqlError error={error} />}
    </div>
  )
}

export function EditObservabilityProviderModal(
  props: ComponentProps<typeof EditObservabilityProviderModalBase>
) {
  return (
    <ModalMountTransition open={props.open}>
      <EditObservabilityProviderModalBase {...props} />
    </ModalMountTransition>
  )
}
