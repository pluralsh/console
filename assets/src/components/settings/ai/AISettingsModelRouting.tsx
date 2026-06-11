import { Button, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { Body2P } from 'components/utils/typography/Text'
import {
  useDeploymentSettingsSuspenseQuery,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { isEqual } from 'lodash'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import {
  initialModelRoutingState,
  modelRoutingRoles,
  ModelRoutingState,
} from './aiModelRoutingUtils.ts'
import { AISettingsModelRoutingRoleCard } from './AISettingsModelRoutingRoleCard.tsx'
import { getConfiguredProviders } from './AISettingsConfiguredProviders.tsx'

export function AISettingsModelRouting() {
  const { popToast } = useSimpleToast()
  const { data: deploymentSettings, error: deploymentSettingsError } =
    useDeploymentSettingsSuspenseQuery()
  const ai = deploymentSettings.deploymentSettings?.ai

  const initialRouting = useMemo(() => initialModelRoutingState(ai), [ai])

  const [routing, setRouting] = useState<ModelRoutingState>(initialRouting)
  const configuredProviders = useMemo(() => getConfiguredProviders(ai), [ai])

  const hasChanges = useMemo(
    () => !isEqual(routing, initialRouting),
    [routing, initialRouting]
  )

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    onCompleted: (data) => {
      popToast({ content: 'Changes saved', severity: 'success' })
      const updatedAi = data?.updateDeploymentSettings?.ai
      setRouting(initialModelRoutingState(updatedAi))
    },
  })

  const handleReset = () => {
    setRouting(initialRouting)
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
          },
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
          Pin specific roles to specific providers. Models are configured per
          provider in AI providers. The router falls back to a provider&apos;s
          default model if none is set.
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
