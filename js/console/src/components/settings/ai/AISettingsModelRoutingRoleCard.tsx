import {
  Flex,
  FormField,
  IconFrame,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { AiProvider, AiSettings } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { aiProviderToLabel } from './AISettingsProviders.tsx'
import {
  effectiveProviderForRole,
  getModelValue,
  ModelDefaultsByProvider,
  ModelRoutingRole,
  modelRoutingRoleMeta,
  ModelRoutingState,
  setRoutingProvider,
} from './aiModelRoutingUtils.ts'
import { aiProviderToIcon } from './AISettingsConfiguredProviders.tsx'

export function AISettingsModelRoutingRoleCard({
  role,
  ai,
  routing,
  onRoutingChange,
  configuredProviders,
  modelDefaultsByProvider,
}: {
  role: ModelRoutingRole
  ai: Nullable<AiSettings>
  routing: ModelRoutingState
  onRoutingChange: (routing: ModelRoutingState) => void
  configuredProviders: AiProvider[]
  modelDefaultsByProvider?: ModelDefaultsByProvider
}) {
  const { title, description, modelHint } = modelRoutingRoleMeta[role]
  const effectiveProvider = effectiveProviderForRole(role, routing)
  const EffectiveProviderIcon = effectiveProvider
    ? aiProviderToIcon[effectiveProvider]
    : null
  const theme = useTheme()
  const modelName = getModelValue(role, routing, ai, modelDefaultsByProvider)

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
              selectedKey={effectiveProvider ?? null}
              leftContent={
                EffectiveProviderIcon ? (
                  <IconFrame
                    size="xsmall"
                    icon={<EffectiveProviderIcon fullColor />}
                  />
                ) : undefined
              }
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
            infoTooltip={modelHint}
          >
            <span
              css={{
                ...theme.partials.text.body2,
                display: 'flex',
                alignItems: 'center',
                minHeight: 36,
                color: theme.colors['text-light'],
              }}
            >
              {modelName}
            </span>
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
