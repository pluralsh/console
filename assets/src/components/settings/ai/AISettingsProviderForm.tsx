import {
  FormField,
  ListBoxItem,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { Body2P } from 'components/utils/typography/Text'
import { AiProvider, AiSettingsAttributes } from 'generated/graphql'
import { ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { PartialDeep } from 'type-fest'
import {
  aiProviderToLabel,
  aiProviders,
  AnthropicSettings,
  AzureSettings,
  BedrockSettings,
  OllamaSettings,
  OpenAISettings,
  VertexSettings,
} from './AISettingsProviders.tsx'

export const providerSettingsKey: Record<
  AiProvider,
  keyof Omit<AiSettingsAttributes, 'enabled' | 'provider'>
> = {
  [AiProvider.Openai]: 'openai',
  [AiProvider.OpenaiCompatible]: 'openaiCompatible',
  [AiProvider.Anthropic]: 'anthropic',
  [AiProvider.Bedrock]: 'bedrock',
  [AiProvider.Ollama]: 'ollama',
  [AiProvider.Azure]: 'azure',
  [AiProvider.Vertex]: 'vertex',
}

export function AISettingsProviderForm({
  enabled,
  provider,
  onProviderChange,
  providerSettings,
  updateProviderSettings,
  error,
  deploymentSettingsError,
  hideProviderSelect = false,
  providerOptions,
  forceEnableProviderSelect = false,
}: {
  enabled: boolean
  provider: AiProvider
  onProviderChange?: (provider: AiProvider) => void
  providerSettings: Omit<AiSettingsAttributes, 'enabled' | 'provider'>
  updateProviderSettings: (
    update: PartialDeep<Omit<AiSettingsAttributes, 'enabled' | 'provider'>>
  ) => void
  error?: Error | null
  deploymentSettingsError?: Error | null
  hideProviderSelect?: boolean
  providerOptions?: readonly AiProvider[]
  forceEnableProviderSelect?: boolean
}) {
  const selectableProviders = providerOptions ?? aiProviders
  let settings: ReactNode
  switch (provider) {
    case AiProvider.Openai:
      settings = (
        <OpenAISettings
          enabled={enabled}
          settings={providerSettings.openai}
          updateSettings={(settings) =>
            updateProviderSettings({ openai: settings })
          }
        />
      )
      break
    case AiProvider.OpenaiCompatible:
      settings = (
        <OpenAISettings
          enabled={enabled}
          settings={providerSettings.openaiCompatible}
          updateSettings={(settings) =>
            updateProviderSettings({ openaiCompatible: settings })
          }
        />
      )
      break
    case AiProvider.Anthropic:
      settings = (
        <AnthropicSettings
          enabled={enabled}
          settings={providerSettings.anthropic}
          updateSettings={(settings) =>
            updateProviderSettings({ anthropic: settings })
          }
        />
      )
      break
    case AiProvider.Bedrock:
      settings = (
        <BedrockSettings
          enabled={enabled}
          settings={providerSettings.bedrock}
          updateSettings={(settings) =>
            updateProviderSettings({ bedrock: settings })
          }
        />
      )
      break
    case AiProvider.Ollama:
      settings = (
        <OllamaSettings
          enabled={enabled}
          settings={providerSettings.ollama}
          updateSettings={(settings) =>
            updateProviderSettings({ ollama: settings })
          }
        />
      )
      break
    case AiProvider.Azure:
      settings = (
        <AzureSettings
          enabled={enabled}
          settings={providerSettings.azure}
          updateSettings={(settings) =>
            updateProviderSettings({ azure: settings })
          }
        />
      )
      break
    case AiProvider.Vertex:
      settings = (
        <VertexSettings
          enabled={enabled}
          settings={providerSettings.vertex}
          updateSettings={(settings) =>
            updateProviderSettings({ vertex: settings })
          }
        />
      )
      break
  }

  return (
    <FormContentSC>
      {(error || deploymentSettingsError) && (
        <GqlError error={error || deploymentSettingsError} />
      )}
      {!hideProviderSelect && (
        <FormField label="AI provider">
          <SelectWithDisable
            disabled={!forceEnableProviderSelect && !enabled}
            selectedKey={provider}
            onSelectionChange={(v) => {
              onProviderChange?.(v as AiProvider)
            }}
          >
            {selectableProviders.map((key) => (
              <ListBoxItem
                key={key}
                label={aiProviderToLabel[key]}
              />
            ))}
          </SelectWithDisable>
        </FormField>
      )}
      <Body2P $color="text-xlight">
        Note: model fields can be left blank to use Plural defaults unless
        otherwise specified.
      </Body2P>
      {settings}
    </FormContentSC>
  )
}

const FormContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

function SelectWithDisable({
  disabled,
  ...props
}: { disabled: boolean } & SelectPropsSingle) {
  const theme = useTheme()
  return (
    <div
      css={
        disabled
          ? {
              '& div:last-child': {
                color: theme.colors['text-input-disabled'],
                cursor: 'unset',
              },
            }
          : undefined
      }
    >
      <Select
        {...props}
        isDisabled={disabled}
      />
    </div>
  )
}
