import { type ComponentProps, useCallback } from 'react'
import { Button, FormField, Modal, Input2 } from '@pluralsh/design-system'
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

const initialDatadogCredentials: ObservabilityProviderCredentialsAttributes = {
  datadog: {
    apiKey: '',
    appKey: '',
  },
}
const initialNewrelicCredentials: ObservabilityProviderCredentialsAttributes = {
  newrelic: {
    apiKey: '',
  },
}

function EditObservabilityProviderModalBase({
  open,
  onClose,
  observabilityProvider,
  operationType,
  refetch,
}: {
  open: boolean
  onClose: Nullable<() => void>
  observabilityProvider?: ObservabilityProviderFragment
  operationType: 'create' | 'update'
  refetch?: () => void
}) {
  const theme = useTheme()
  const {
    state: formState,
    update: updateFormState,
    hasUpdates,
  } = useUpdateState({
    name: observabilityProvider?.name || '',
    type: observabilityProvider?.type || ObservabilityProviderType.Datadog,
    credentials:
      observabilityProvider?.type === ObservabilityProviderType.Datadog
        ? initialDatadogCredentials
        : initialNewrelicCredentials,
  })

  const [mutation, { loading, error }] = useUpsertObservabilityProviderMutation(
    {
      onCompleted: () => {
        refetch?.()
        onClose?.()
      },
    }
  )

  const { name, type, credentials } = formState

  const hasCredentials =
    (type === ObservabilityProviderType.Datadog &&
      credentials.datadog?.apiKey &&
      credentials.datadog?.appKey) ||
    (type === ObservabilityProviderType.Newrelic &&
      credentials.newrelic?.apiKey)

  const allowSubmit = name && type && hasUpdates && hasCredentials

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
      open={open}
      onClose={onClose || undefined}
      asForm
      onSubmit={onSubmit}
      header={
        operationType === 'update' && observabilityProvider
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
            {operationType === 'create' ? 'Create' : 'Update'}
          </Button>
          <Button
            secondary
            type="button"
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <ObservabilityProviderForm
        formState={formState}
        updateFormState={updateFormState}
        error={error}
        operationType={operationType}
      />
    </Modal>
  )
}

export function ObservabilityProviderForm({
  formState,
  updateFormState,
  error,
  operationType,
}: {
  formState: Partial<ObservabilityProviderAttributes>
  updateFormState: (update: Partial<ObservabilityProviderAttributes>) => void
  error: ApolloError | undefined
  operationType: 'create' | 'update'
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
        updateSelectedKey={(type) =>
          updateFormState({
            type,
            credentials:
              type === ObservabilityProviderType.Datadog
                ? initialDatadogCredentials
                : initialNewrelicCredentials,
          })
        }
      />
      <FormField
        label="Name"
        required
      >
        <Input2
          value={formState.name}
          onChange={(e) => updateFormState({ name: e.target.value })}
          disabled={operationType === 'update'}
        />
      </FormField>

      {formState.type === ObservabilityProviderType.Datadog ? (
        <>
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
          <FormField
            label="App Key"
            required
          >
            <InputRevealer
              defaultRevealed={false}
              value={formState.credentials?.datadog?.appKey || ''}
              onChange={(e) =>
                updateFormState({
                  credentials: {
                    datadog: {
                      apiKey: formState.credentials?.datadog?.apiKey || '',
                      appKey: e.target.value,
                    },
                  },
                })
              }
            />
          </FormField>
        </>
      ) : (
        <FormField
          label="Api Key"
          required
        >
          <InputRevealer
            defaultRevealed={false}
            value={formState.credentials?.newrelic?.apiKey || ''}
            onChange={(e) =>
              updateFormState({
                credentials: {
                  newrelic: {
                    apiKey: e.target.value,
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
