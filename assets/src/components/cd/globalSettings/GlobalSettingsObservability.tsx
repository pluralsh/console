import {
  Button,
  FormField,
  Input,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  getGlobalSettingsBreadcrumbs,
  useGlobalSettingsContext,
} from './GlobalSettings'
import { FormEventHandler, useCallback, useMemo } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useTheme } from 'styled-components'
import { StepH } from '../ModalAlt'
import { useUpdateDeploymentSettingsMutation } from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { useUpdateState } from 'components/hooks/useUpdateState'

function HttpForm({ name, connection, setConnection }) {
  const theme = useTheme()
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: theme.spacing.small,
      }}
    >
      <StepH>{name}</StepH>
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
    </div>
  )
}

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
        marginTop: theme.spacing.medium,
        gap: theme.spacing.medium,
        flexDirection: 'row-reverse',
      }}
    >
      <Button
        primary
        type="submit"
        disabled={!allowSubmit}
        loading={loading}
      >
        Save
      </Button>
      <Button
        secondary
        type="button"
        onClick={() => formState.reset()}
      >
        Cancel
      </Button>
    </div>
  )
}

export default function GlobalSettingsObservability() {
  const theme = useTheme()
  const { deploymentSettings, refetch } = useGlobalSettingsContext()
  const formState = useUpdateState({
    prometheusConnection: prune(deploymentSettings.prometheusConnection),
    lokiConnection: prune(deploymentSettings.lokiConnection),
  })

  const [updateSettings, { loading, error }] =
    useUpdateDeploymentSettingsMutation()

  useSetBreadcrumbs(
    useMemo(() => getGlobalSettingsBreadcrumbs({ page: 'repositories' }), [])
  )

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
    <ScrollablePage heading="Observability Settings">
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
        <HttpForm
          name="Prometheus Connection Details"
          connection={formState.state.prometheusConnection}
          setConnection={(prometheusConnection) =>
            formState.update({ prometheusConnection })
          }
        />
        <HttpForm
          name="Loki Connection Details"
          connection={formState.state.lokiConnection}
          setConnection={(lokiConnection) =>
            formState.update({ lokiConnection })
          }
        />
        <SubmitRow
          loading={loading}
          allowSubmit={allowSubmit}
          formState={formState}
        />
      </form>
    </ScrollablePage>
  )
}
