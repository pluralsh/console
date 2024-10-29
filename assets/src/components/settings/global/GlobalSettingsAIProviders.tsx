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
  if (ai?.openai) {
    return {
      openai: {
        model: ai.openai.model,
        accessToken: '',
      },
    }
  }

  if (ai?.anthropic) {
    return {
      anthropic: {
        model: ai.anthropic.model,
        accessToken: '',
      },
    }
  }

  if (ai?.ollama) {
    return {
      ollama: {
        model: ai.ollama.model,
        url: ai.ollama.url,
        authorization: '',
      },
    }
  }

  if (ai?.azure) {
    return {
      azure: {
        apiVersion: ai.azure.apiVersion,
        endpoint: ai.azure.endpoint,
        accessToken: '',
      },
    }
  }

  if (ai?.bedrock) {
    return {
      bedrock: {
        modelId: ai.bedrock.modelId,
        accessKeyId: ai.bedrock.accessKeyId,
        secretAccessKey: '',
      },
    }
  }

  return {}
}

export function validateAttributes(
  provider: AiProvider,
  settings: Omit<AiSettingsAttributes, 'enabled' | 'provider'>
): boolean {
  switch (provider) {
    case AiProvider.Openai:
      return !!settings.openai?.accessToken
    case AiProvider.Anthropic:
      return !!settings.anthropic?.accessToken
    case AiProvider.Ollama:
      return !!(settings.ollama?.url && settings.ollama?.authorization)
    case AiProvider.Azure:
      return !!(
        settings.azure?.apiVersion &&
        settings.azure?.endpoint &&
        settings.azure?.accessToken
      )
    case AiProvider.Bedrock:
      return !!(
        settings.bedrock?.accessKeyId && settings.bedrock?.secretAccessKey
      )
    default:
      return false
  }
}

export function OpenAIAnthropicSettings({
  enabled,
  settings,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['openai'] | AiSettingsAttributes['anthropic']
  updateSettings: (
    update: NonNullable<
      Partial<
        AiSettingsAttributes['openai'] | AiSettingsAttributes['anthropic']
      >
    >
  ) => void
}) {
  const theme = useTheme()

  return (
    <>
      <FormField
        label="Model"
        flex={1}
      >
        <Input
          disabled={!enabled}
          placeholder="Leave blank for Plural default"
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
          placeholder="Enter access token"
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
        flex={1}
      >
        <Input
          disabled={!enabled}
          placeholder="Leave blank for Plural default"
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
          placeholder="Enter authorization header"
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
          placeholder="Enter access token"
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
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.modelId}
          placeholder="Leave blank for Plural default"
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
          placeholder="Enter access key ID"
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
          placeholder="Enter secret access key"
          value={settings?.secretAccessKey ?? undefined}
          onChange={(e) => {
            updateSettings({ secretAccessKey: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}
