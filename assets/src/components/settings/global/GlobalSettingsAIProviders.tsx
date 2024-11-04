import {
  AiProvider,
  AiSettings,
  AiSettingsAttributes,
} from '../../../generated/graphql.ts'
import { FormField, Input } from '@pluralsh/design-system'
import { InputRevealer } from '../../cd/providers/InputRevealer.tsx'
import { useTheme } from 'styled-components'

export function initialSettingsAttributes(
  ai: Nullable<AiSettings>
): Omit<AiSettingsAttributes, 'enabled' | 'provider'> {
  return ai
    ? {
        ...(ai.anthropic
          ? {
              anthropic: {
                model: ai.anthropic.model,
                accessToken: '',
              },
            }
          : {}),
        ...(ai.azure
          ? {
              azure: {
                apiVersion: ai.azure.apiVersion,
                endpoint: ai.azure.endpoint,
                accessToken: '',
              },
            }
          : {}),
        ...(ai.bedrock
          ? {
              bedrock: {
                modelId: ai.bedrock.modelId,
                accessKeyId: ai.bedrock.accessKeyId,
                secretAccessKey: '',
              },
            }
          : {}),
        ...(ai.ollama
          ? {
              ollama: {
                model: ai.ollama.model,
                url: ai.ollama.url,
                authorization: '',
              },
            }
          : {}),
        ...(ai.openai
          ? {
              openai: {
                model: ai.openai.model,

                accessToken: '',
              },
            }
          : {}),
      }
    : {}
}

export function validateAttributes(
  enabled: boolean,
  provider: AiProvider,
  settings: Omit<AiSettingsAttributes, 'enabled' | 'provider'>
): boolean {
  if (!enabled) return true

  switch (provider) {
    case AiProvider.Openai:
      return !!settings.openai?.accessToken
    case AiProvider.Anthropic:
      return !!settings.anthropic?.accessToken
    case AiProvider.Ollama:
      return !!(
        settings.ollama?.model &&
        settings.ollama?.url &&
        settings.ollama?.authorization
      )
    case AiProvider.Azure:
      return !!(
        settings.azure?.apiVersion &&
        settings.azure?.endpoint &&
        settings.azure?.accessToken
      )
    case AiProvider.Bedrock:
      return !!(
        settings.bedrock?.modelId &&
        settings.bedrock?.accessKeyId &&
        settings.bedrock?.secretAccessKey
      )
    default:
      return false
  }
}

export function OpenAISettings({
  enabled,
  settings,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['openai']
  updateSettings: (
    update: NonNullable<Partial<AiSettingsAttributes['openai']>>
  ) => void
}) {
  const theme = useTheme()

  return (
    <>
      <FormField
        label="Model"
        hint="Leave blank for Plural default."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => {
            updateSettings({ model: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Base URL"
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.baseUrl}
          onChange={(e) => {
            updateSettings({ baseUrl: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Access token"
        required={enabled}
        flex={1}
      >
        <InputRevealer
          css={{ background: theme.colors['fill-two'] }}
          disabled={!enabled}
          value={settings?.accessToken ?? undefined}
          onChange={(e) => {
            updateSettings({ accessToken: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}

export function AnthropicSettings({
  enabled,
  settings,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['anthropic']
  updateSettings: (
    update: NonNullable<Partial<AiSettingsAttributes['anthropic']>>
  ) => void
}) {
  const theme = useTheme()

  return (
    <>
      <FormField
        label="Model"
        hint="Leave blank for Plural default."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => {
            updateSettings({ model: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Access token"
        required={enabled}
        flex={1}
      >
        <InputRevealer
          css={{ background: theme.colors['fill-two'] }}
          disabled={!enabled}
          value={settings?.accessToken ?? undefined}
          onChange={(e) => {
            updateSettings({ accessToken: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}

export function OllamaSettings({
  enabled,
  settings,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['ollama']
  updateSettings: (
    update: NonNullable<Partial<AiSettingsAttributes['ollama']>>
  ) => void
}) {
  const theme = useTheme()

  return (
    <>
      <FormField
        label="Model"
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => {
            updateSettings({ model: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="URL"
        hint="The URL your Ollama deployment is hosted on."
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.url}
          onChange={(e) => {
            updateSettings({ url: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Authorization"
        hint="An HTTP Authorization header to use on calls to the Ollama API."
        required={enabled}
        flex={1}
      >
        <InputRevealer
          css={{ background: theme.colors['fill-two'] }}
          disabled={!enabled}
          value={settings?.authorization ?? undefined}
          onChange={(e) => {
            updateSettings({ authorization: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}

export function AzureSettings({
  enabled,
  settings,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['azure']
  updateSettings: (
    update: NonNullable<Partial<AiSettingsAttributes['azure']>>
  ) => void
}) {
  const theme = useTheme()

  return (
    <>
      <FormField
        label="API version"
        hint="The API version you want to use."
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.apiVersion}
          onChange={(e) => {
            updateSettings({ apiVersion: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Endpoint"
        hint="The endpoint of your Azure OpenAI version. It should look like https://{endpoint}/openai/deployments/{deployment-id}."
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.endpoint}
          onChange={(e) => {
            updateSettings({ endpoint: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Access token"
        hint="The Azure OpenAI access token to use."
        required={enabled}
        flex={1}
      >
        <InputRevealer
          css={{ background: theme.colors['fill-two'] }}
          disabled={!enabled}
          value={settings?.accessToken ?? undefined}
          onChange={(e) => {
            updateSettings({ accessToken: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}

export function BedrockSettings({
  enabled,
  settings,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['bedrock']
  updateSettings: (
    update: NonNullable<Partial<AiSettingsAttributes['bedrock']>>
  ) => void
}) {
  const theme = useTheme()

  return (
    <>
      <FormField
        label="Model ID"
        hint="The Model ID you want to use."
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.modelId}
          onChange={(e) => {
            updateSettings({ modelId: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Access key ID"
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.accessKeyId}
          onChange={(e) => {
            updateSettings({ accessKeyId: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Secret access key"
        required={enabled}
        flex={1}
      >
        <InputRevealer
          css={{ background: theme.colors['fill-two'] }}
          disabled={!enabled}
          value={settings?.secretAccessKey ?? undefined}
          onChange={(e) => {
            updateSettings({ secretAccessKey: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}
