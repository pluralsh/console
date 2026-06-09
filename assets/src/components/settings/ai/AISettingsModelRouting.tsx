import { Button, Flex, Toast } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Body2P } from 'components/utils/typography/Text'
import {
  AiSettingsAttributes,
  useDeploymentSettingsSuspenseQuery,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEqual } from 'lodash'
import merge from 'lodash/merge'
import { useMemo, useReducer, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { PartialDeep } from 'type-fest'
import {
  initialModelRoutingState,
  modelRoutingRoles,
  ModelRoutingState,
} from './aiModelRoutingUtils.ts'
import { AISettingsModelRoutingRoleCard } from './AISettingsModelRoutingRoleCard.tsx'
import { getConfiguredProviders } from './AISettingsConfiguredProviders.tsx'
import { initialSettingsAttributes } from './AISettingsProviders.tsx'

const updateSettings = produce(
  (
    original: Omit<AiSettingsAttributes, 'enabled' | 'provider'>,
    update: PartialDeep<Omit<AiSettingsAttributes, 'enabled' | 'provider'>>
  ) => {
    merge(original, update)

    return original
  }
)

export function AISettingsModelRouting() {
  const theme = useTheme()
  const { data: deploymentSettings, error: deploymentSettingsError } =
    useDeploymentSettingsSuspenseQuery()
  const ai = deploymentSettings.deploymentSettings?.ai

  const initialRouting = useMemo(() => initialModelRoutingState(ai), [ai])
  const initialProviderSettings = useMemo(
    () => initialSettingsAttributes(ai),
    [ai]
  )

  const [routing, setRouting] = useState<ModelRoutingState>(initialRouting)
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    initialProviderSettings
  )
  const [showToast, setShowToast] = useState(false)

  const configuredProviders = useMemo(() => getConfiguredProviders(ai), [ai])

  const hasChanges = useMemo(
    () =>
      !isEqual(routing, initialRouting) ||
      !isEqual(providerSettings, initialProviderSettings),
    [routing, initialRouting, providerSettings, initialProviderSettings]
  )

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    onCompleted: (data) => {
      setShowToast(true)
      const updatedAi = data?.updateDeploymentSettings?.ai
      setRouting(initialModelRoutingState(updatedAi))
      updateProviderSettings(initialSettingsAttributes(updatedAi))
    },
  })

  const handleReset = () => {
    setRouting(initialRouting)
    updateProviderSettings(initialProviderSettings)
  }

  const handleSave = () => {
    if (!ai?.enabled) return

    mutation({
      variables: {
        attributes: {
          ai: {
            enabled: true,
            provider: routing.provider,
            toolProvider: routing.toolProvider,
            embeddingProvider: routing.embeddingProvider,
            ...providerSettings,
          } satisfies AiSettingsAttributes,
        },
      },
    })
  }

  return (
    <ScrollablePage>
      <Flex
        direction="column"
        gap="medium"
      >
        <Body2P $color="text-light">
          Pin specific roles to specific provider and model combinations. The
          router falls back to a provider&apos;s default model if a role is
          unset.
        </Body2P>
        {deploymentSettingsError && (
          <GqlError error={deploymentSettingsError} />
        )}
        {error && <GqlError error={error} />}
        {modelRoutingRoles.map((role) => (
          <AISettingsModelRoutingRoleCard
            key={role}
            role={role}
            ai={ai}
            routing={routing}
            onRoutingChange={setRouting}
            providerSettings={providerSettings}
            onProviderSettingsChange={updateProviderSettings}
            configuredProviders={configuredProviders}
          />
        ))}
        <ActionsSC>
          <Button
            secondary
            type="button"
            disabled={!hasChanges || loading}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={!hasChanges || loading}
            loading={loading}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </ActionsSC>
      </Flex>
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

const ActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing.medium,
}))
