import {
  ComboBox,
  Flex,
  FormField,
  IconFrame,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { AiProvider, AiSettings } from 'generated/graphql'
import { useMemo } from 'react'
import styled from 'styled-components'
import { aiProviderToLabel } from './AISettingsProviders.tsx'
import {
  getModelSuggestions,
  getModelValue,
  ModelRoutingRole,
  modelRoutingRoleMeta,
  ModelRoutingState,
  selectedProviderForRole,
  setModelValue,
  setRoutingProvider,
} from './aiModelRoutingUtils.ts'
import { aiProviderToIcon } from './AISettingsConfiguredProviders.tsx'

export function AISettingsModelRoutingRoleCard({
  role,
  ai,
  routing,
  onRoutingChange,
  providerSettings,
  onProviderSettingsChange,
  configuredProviders,
}: {
  role: ModelRoutingRole
  ai: Nullable<AiSettings>
  routing: ModelRoutingState
  onRoutingChange: (routing: ModelRoutingState) => void
  providerSettings: Parameters<typeof setModelValue>[2]
  onProviderSettingsChange: (settings: ReturnType<typeof setModelValue>) => void
  configuredProviders: AiProvider[]
}) {
  const { title, description, modelHint } = modelRoutingRoleMeta[role]
  const selectedProvider = selectedProviderForRole(role, routing)
  const modelValue = getModelValue(role, routing, providerSettings, ai)
  const modelSuggestions = useMemo(
    () => (selectedProvider ? getModelSuggestions(selectedProvider, ai) : []),
    [ai, selectedProvider]
  )

  return (
    <CardSC>
      <Flex
        align="flex-start"
        gap="xlarge"
        justify="space-between"
        width="100%"
      >
        <Flex
          direction="column"
          gap="xsmall"
          css={{ flex: 1, minWidth: 0 }}
        >
          <Body2BoldP>{title}</Body2BoldP>
          <Body2P $color="text-light">{description}</Body2P>
        </Flex>
        <FieldsSC>
          <FormField label="Provider">
            <Select
              label="Select provider"
              selectedKey={selectedProvider ?? null}
              onSelectionChange={(key) => {
                onRoutingChange(
                  setRoutingProvider(role, (key as AiProvider) ?? null, routing)
                )
              }}
            >
              {configuredProviders.map((provider) => {
                const Icon = aiProviderToIcon[provider]

                return (
                  <ListBoxItem
                    key={provider}
                    label={aiProviderToLabel[provider]}
                    leftContent={
                      <IconFrame
                        size="xsmall"
                        icon={<Icon fullColor />}
                      />
                    }
                  />
                )
              })}
            </Select>
          </FormField>
          <FormField
            label="Model"
            hint={modelHint}
          >
            <ComboBox
              inputValue={modelValue}
              inputProps={{ placeholder: 'Model ID' }}
              onInputChange={(value) => {
                onProviderSettingsChange(
                  setModelValue(role, routing, providerSettings, value)
                )
              }}
              onSelectionChange={(key) => {
                if (key) {
                  onProviderSettingsChange(
                    setModelValue(role, routing, providerSettings, String(key))
                  )
                }
              }}
              isDisabled={role !== 'chat' && !routing.provider}
            >
              {modelSuggestions.map((model) => (
                <ListBoxItem
                  key={model}
                  label={model}
                />
              ))}
            </ComboBox>
          </FormField>
        </FieldsSC>
      </Flex>
    </CardSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.xlarge,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  backgroundColor: theme.colors['fill-one'],
}))

const FieldsSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 1fr)',
  gap: theme.spacing.medium,
  flexShrink: 0,
  width: '100%',
  maxWidth: 480,
}))
