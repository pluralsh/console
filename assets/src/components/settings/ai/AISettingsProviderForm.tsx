import {
  FormField,
  ListBoxItem,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import {
  AiProvider,
  AiSettingsAttributes,
  ModelDefault,
} from 'generated/graphql'
import { ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { PartialDeep } from 'type-fest'
import {
  aiProviderToLabel,
  AnthropicSettings,
  AzureSettings,
  BedrockSettings,
  OllamaSettings,
  OpenAISettings,
  VertexSettings,
} from './AISettingsProviders.tsx'

export function AISettingsProviderForm({
  enabled,
  provider,
  onProviderChange,
  providerSettings,
  updateProviderSettings,
  modelDefaultsByProvider,
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
  modelDefaultsByProvider?: Partial<Record<AiProvider, ModelDefault>>
  error?: Error | null
  deploymentSettingsError?: Error | null
  hideProviderSelect?: boolean
  providerOptions?: readonly AiProvider[]
  forceEnableProviderSelect?: boolean
}) {
  const selectableProviders = providerOptions ?? Object.values(AiProvider)
  let settings: ReactNode
  switch (provider) {
    case AiProvider.Openai:
      settings = (
        <OpenAISettings
          enabled={enabled}
          settings={providerSettings.openai}
          modelDefaults={modelDefaultsByProvider?.[AiProvider.Openai]}
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
          modelDefaults={modelDefaultsByProvider?.[AiProvider.OpenaiCompatible]}
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
          modelDefaults={modelDefaultsByProvider?.[AiProvider.Anthropic]}
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
          modelDefaults={modelDefaultsByProvider?.[AiProvider.Bedrock]}
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
          modelDefaults={modelDefaultsByProvider?.[AiProvider.Ollama]}
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
          modelDefaults={modelDefaultsByProvider?.[AiProvider.Azure]}
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
          modelDefaults={modelDefaultsByProvider?.[AiProvider.Vertex]}
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
