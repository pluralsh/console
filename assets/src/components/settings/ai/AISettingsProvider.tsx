import { Button, Callout, Flex, Switch, Toast } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Body2P } from 'components/utils/typography/Text'
import {
  AiProvider,
  AiSettingsAttributes,
  useDeploymentSettingsSuspenseQuery,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import merge from 'lodash/merge'
import pick from 'lodash/pick'
import { FormEvent, useMemo, useReducer, useState } from 'react'
import { useTheme } from 'styled-components'
import { PartialDeep } from 'type-fest'
import {
  AISettingsConfiguredProviders,
  getUnconfiguredProviders,
} from './AISettingsConfiguredProviders.tsx'
import { AISettingsProviderModal } from './AISettingsProviderEditModal.tsx'
import { providerSettingsKey } from './AISettingsProviderForm.tsx'
import {
  initialSettingsAttributes,
  validateAttributes,
} from './AISettingsProviders.tsx'

const updateSettings = produce(
  (
    original: Omit<AiSettingsAttributes, 'enabled' | 'provider'>,
    update: PartialDeep<Omit<AiSettingsAttributes, 'enabled' | 'provider'>>
  ) => {
    merge(original, update)

    return original
  }
)

export function AISettingsProvider() {
  const theme = useTheme()
  const { data: deploymentSettings, error: deploymentSettingsError } =
    useDeploymentSettingsSuspenseQuery()
  const ai = deploymentSettings.deploymentSettings?.ai

  const [enabled, setEnabled] = useState<boolean>(ai?.enabled ?? false)
  const activeProvider = ai?.provider ?? AiProvider.Openai
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    initialSettingsAttributes(ai)
  )
  const [showToast, setShowToast] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] =
    useState<Nullable<AiProvider>>(null)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [connectingProvider, setConnectingProvider] =
    useState<Nullable<AiProvider>>(null)

  const unconfiguredProviders = useMemo(
    () => getUnconfiguredProviders(ai),
    [ai]
  )

  const editValid = useMemo(
    () =>
      editingProvider
        ? validateAttributes(enabled, editingProvider, providerSettings)
        : false,
    [enabled, editingProvider, providerSettings]
  )

  const connectValid = useMemo(
    () =>
      connectingProvider
        ? validateAttributes(enabled, connectingProvider, providerSettings)
        : false,
    [enabled, connectingProvider, providerSettings]
  )

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    onCompleted: (data) => {
      setShowToast(true)
      setEditModalOpen(false)
      setEditingProvider(null)
      setConnectModalOpen(false)
      setConnectingProvider(null)
      updateProviderSettings(
        initialSettingsAttributes(data?.updateDeploymentSettings?.ai)
      )
    },
  })

  const saveSettings = (
    settingsProvider: AiProvider,
    routingProvider: AiProvider
  ) => {
    mutation({
      variables: {
        attributes: {
          ai: {
            enabled,
            ...(enabled
              ? {
                  provider: routingProvider,
                  ...pick(
                    providerSettings,
                    providerSettingsKey[settingsProvider]
                  ),
                }
              : {}),
          } satisfies AiSettingsAttributes,
        },
      },
    })
  }

  const saveEnabled = (checked: boolean) => {
    setEnabled(checked)
    mutation({
      variables: {
        attributes: {
          ai: {
            enabled: checked,
            ...(checked
              ? {
                  provider: activeProvider,
                  ...providerSettings,
                }
              : {}),
          } satisfies AiSettingsAttributes,
        },
      },
    })
  }

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!editingProvider) return

    saveSettings(editingProvider, activeProvider)
  }

  const handleEditProvider = (editProvider: AiProvider) => {
    setEditingProvider(editProvider)
    setEditModalOpen(true)
  }

  const handleConnectProvider = () => {
    const nextProvider = unconfiguredProviders[0]
    if (!nextProvider) return

    setConnectingProvider(nextProvider)
    setConnectModalOpen(true)
  }

  const handleConnectSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!connectingProvider) return

    saveSettings(connectingProvider, activeProvider)
  }

  const formProps = {
    enabled,
    provider: activeProvider,
    providerSettings,
    updateProviderSettings,
    loading,
    saveDisabled: !ai?.enabled && !enabled,
    error,
    deploymentSettingsError,
  }

  return (
    <ScrollablePage>
      <Flex
        direction="column"
        gap="medium"
      >
        <Switch
          checked={enabled}
          onChange={saveEnabled}
        >
          {enabled ? 'Disable' : 'Enable'} AI in Plural
        </Switch>
        {!enabled && (
          <Callout
            severity="neutral"
            size="compact"
            css={{ padding: theme.spacing.small }}
          >
            Plural AI is disabled. Enable to access Model routing and AI
            insights tabs.
          </Callout>
        )}
        <Flex
          align="center"
          gap="xlarge"
        >
          <Body2P $color="text-light">
            Connect the LLM and embedding providers you want Plural AI to use.
            You can connect more than one and pin specific roles in Model
            routing.
          </Body2P>
          {unconfiguredProviders.length > 0 && (
            <Button
              disabled={!enabled}
              style={{ flexShrink: 0 }}
              onClick={handleConnectProvider}
            >
              Connect provider
            </Button>
          )}
        </Flex>
        <AISettingsConfiguredProviders
          ai={ai}
          enabled={enabled}
          onEdit={handleEditProvider}
        />
      </Flex>
      {editingProvider && (
        <AISettingsProviderModal
          open={editModalOpen}
          hideProviderSelect
          onClose={() => {
            setEditModalOpen(false)
            setEditingProvider(null)
          }}
          {...formProps}
          provider={editingProvider}
          onSubmit={handleEditSubmit}
          valid={editValid}
        />
      )}
      {connectingProvider && (
        <AISettingsProviderModal
          open={connectModalOpen}
          header="Connect AI provider"
          providerOptions={unconfiguredProviders}
          forceEnableProviderSelect
          onClose={() => {
            setConnectModalOpen(false)
            setConnectingProvider(null)
          }}
          {...formProps}
          provider={connectingProvider}
          onProviderChange={setConnectingProvider}
          onSubmit={handleConnectSubmit}
          valid={connectValid}
        />
      )}
      <Toast
        severity="success"
        css={{ margin: theme.spacing.large }}
        position="bottom"
        show={showToast}
        onClose={() => setShowToast(false)}
      >
        Changes saved
      </Toast>
    </ScrollablePage>
  )
}
