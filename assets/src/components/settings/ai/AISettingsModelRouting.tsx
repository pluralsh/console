import { Button, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
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
import styled from 'styled-components'
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
  const { popToast } = useSimpleToast()
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
  const configuredProviders = useMemo(() => getConfiguredProviders(ai), [ai])

  const hasChanges = useMemo(
    () =>
      !isEqual(routing, initialRouting) ||
      !isEqual(providerSettings, initialProviderSettings),
    [routing, initialRouting, providerSettings, initialProviderSettings]
  )

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    onCompleted: (data) => {
      popToast({ content: 'Changes saved', severity: 'success' })
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
    </ScrollablePage>
  )
}

const ActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing.medium,
}))
