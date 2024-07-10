import { Button, Card, FormField, Input } from '@pluralsh/design-system'

import { FormEventHandler, useCallback } from 'react'
import styled, { useTheme } from 'styled-components'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import { useUpdateDeploymentSettingsMutation } from 'generated/graphql'

import { useGlobalSettingsContext } from '../GlobalSettings'

export default function ObservabilitySettings() {
  const theme = useTheme()
  const { deploymentSettings, refetch } = useGlobalSettingsContext()
  const formState = useUpdateState({
    prometheusConnection: prune(deploymentSettings.prometheusConnection),
    lokiConnection: prune(deploymentSettings.lokiConnection),
  })

  const [updateSettings, { loading, error }] =
    useUpdateDeploymentSettingsMutation()

  const allowSubmit = formState.hasUpdates

  const onSubmit = useCallback<FormEventHandler>(
    (e) => {
      e.preventDefault()
      if (allowSubmit) {
        updateSettings({
          variables: {
            attributes: {
              prometheusConnection: formState.state.prometheusConnection,
              lokiConnection: formState.state.lokiConnection,
            },
          },
          onCompleted: (data) => {
            const { lokiConnection, prometheusConnection } =
              data?.updateDeploymentSettings || {}

            formState.update({
              ...(lokiConnection
                ? { lokiConnection: prune(lokiConnection) }
                : {}),
              ...(prometheusConnection
                ? { prometheusConnection: prune(prometheusConnection) }
                : {}),
            })
            refetch()
          },
        })
      }
    },
    [allowSubmit, formState, refetch, updateSettings]
  )

  return (
    <ObservabilitySettingsCardSC>
      <form
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
        onSubmit={onSubmit}
      >
        {error && (
          <GqlError
            error={error}
            header="Failed to update observability settings"
          />
        )}
        <SubmitRow
          loading={loading}
          allowSubmit={allowSubmit}
          formState={formState}
        />
        <HttpForm
          name="Prometheus connection"
          connection={formState.state.prometheusConnection}
          setConnection={(prometheusConnection) =>
            formState.update({ prometheusConnection })
          }
        />
        <HttpForm
          name="Loki connection"
          connection={formState.state.lokiConnection}
          setConnection={(lokiConnection) =>
            formState.update({ lokiConnection })
          }
        />
      </form>
    </ObservabilitySettingsCardSC>
  )
}

const ObservabilitySettingsCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.xlarge,
}))

function HttpForm({ name, connection, setConnection }) {
  return (
    <FormWrapperSC>
      <StepHeaderSC>{name}</StepHeaderSC>
      <FormRowSC>
        <FormField label="Host">
          <Input
            value={connection?.host || ''}
            placeholder="https://some.domain"
            onChange={(e) =>
              setConnection({ ...connection, host: e.currentTarget.value })
            }
          />
        </FormField>
        <FormField label="User">
          <Input
            value={connection?.user || ''}
            placeholder="plural-user"
            onChange={(e) =>
              setConnection({ ...connection, user: e.currentTarget.value })
            }
          />
        </FormField>
      </FormRowSC>
      <FormField label="Password">
        <Input
          inputProps={{ type: 'password' }}
          value={connection?.password || ''}
          placeholder="super secret password"
          onChange={(e) =>
            setConnection({ ...connection, password: e.currentTarget.value })
          }
        />
      </FormField>
    </FormWrapperSC>
  )
}

const StepHeaderSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle2,
}))
const FormWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  marginBottom: theme.spacing.large,
}))
const FormRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
  '& > *': {
    flex: 1,
  },
}))

function prune(connection) {
  return {
    host: connection?.host || 'https://example.com',
    user: connection?.user,
    password: connection?.password,
  }
}

function SubmitRow({ allowSubmit, loading, formState }) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span
        css={{
          ...theme.partials.text.overline,
          color: theme.colors['text-xlight'],
        }}
      >
        observability settings
      </span>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
        }}
      >
        <Button
          secondary
          type="button"
          onClick={() => formState.reset()}
        >
          Cancel
        </Button>
        <Button
          primary
          type="submit"
          disabled={!allowSubmit}
          loading={loading}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
