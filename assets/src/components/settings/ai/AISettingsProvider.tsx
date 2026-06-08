import { Card, Flex, Switch, Toast } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
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
import styled, { useTheme } from 'styled-components'
import { PartialDeep } from 'type-fest'
import { AISettingsConfiguredProviders } from './AISettingsConfiguredProviders.tsx'
import { AISettingsProviderEditModal } from './AISettingsProviderEditModal.tsx'
import {
  AISettingsProviderForm,
  providerSettingsKey,
} from './AISettingsProviderForm.tsx'
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
  const [provider, setProvider] = useState<AiProvider>(
    ai?.provider ?? AiProvider.Openai
  )
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    initialSettingsAttributes(ai)
  )
  const [showToast, setShowToast] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] =
    useState<Nullable<AiProvider>>(null)

  const valid = useMemo(
    () => validateAttributes(enabled, provider, providerSettings),
    [enabled, provider, providerSettings]
  )

  const editValid = useMemo(
    () =>
      editingProvider
        ? validateAttributes(enabled, editingProvider, providerSettings)
        : false,
    [enabled, editingProvider, providerSettings]
  )

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    onCompleted: (data) => {
      setShowToast(true)
      setEditModalOpen(false)
      setEditingProvider(null)
      updateProviderSettings(
        initialSettingsAttributes(data?.updateDeploymentSettings?.ai)
      )
    },
  })

  const saveSettings = (
    settingsProvider: AiProvider,
    activeProvider: AiProvider
  ) => {
    mutation({
      variables: {
        attributes: {
          ai: {
            enabled,
            ...(enabled
              ? {
                  provider: activeProvider,
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveSettings(provider, provider)
  }

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!editingProvider) return

    saveSettings(editingProvider, ai?.provider ?? provider)
  }

  const handleEditProvider = (editProvider: AiProvider) => {
    setEditingProvider(editProvider)
    setEditModalOpen(true)
  }

  const formProps = {
    enabled,
    provider,
    onProviderChange: setProvider,
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
        <AISettingsConfiguredProviders
          ai={ai}
          onEdit={handleEditProvider}
        />
        <Switch
          checked={enabled}
          onChange={(checked) => setEnabled(checked)}
        >
          Enable AI insights
        </Switch>
        <WrapperCardSC>
          <AISettingsProviderForm
            {...formProps}
            onSubmit={handleSubmit}
            valid={valid}
          />
        </WrapperCardSC>
      </Flex>
      {editingProvider && (
        <AISettingsProviderEditModal
          open={editModalOpen}
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

const WrapperCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.xlarge,
}))
