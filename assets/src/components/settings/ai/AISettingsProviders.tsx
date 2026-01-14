import { FormField, Input } from '@pluralsh/design-system'
import { FileDrop, FileDropFile } from 'components/utils/FileDrop.tsx'
import { isEmpty } from 'lodash'
import { useCallback, useState } from 'react'
import { DropzoneOptions } from 'react-dropzone'
import { useTheme } from 'styled-components'
import {
  AiProvider,
  AiSettings,
  AiSettingsAttributes,
} from '../../../generated/graphql.ts'
import { InputRevealer } from '../../cd/providers/InputRevealer.tsx'

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
                model: ai.azure.model,
                embeddingModel: ai.azure.embeddingModel,
                accessToken: '',
              },
            }
          : {}),
        ...(ai.bedrock
          ? {
              bedrock: {
                modelId: ai.bedrock.modelId,
                embeddingModel: ai.bedrock.embeddingModel,
                accessToken: '',
                region: ai.bedrock.region,
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
                embeddingModel: ai.openai.embeddingModel,
                baseUrl: ai.openai.baseUrl,
                accessToken: '',
              },
            }
          : {}),
        ...(ai.vertex
          ? {
              vertex: {
                model: ai.vertex.model,
                embeddingModel: ai.vertex.embeddingModel,
                serviceAccountJson: '',
                project: ai.vertex.project,
                location: ai.vertex.location,
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
        settings.bedrock?.accessToken &&
        settings.bedrock?.region
      )
    case AiProvider.Vertex:
      return !!(settings.vertex?.project && settings.vertex?.location)
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
        label="Embedding Model"
        hint="Leave blank for Plural default."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) => {
            updateSettings({ embeddingModel: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Base URL"
        hint="The base URL to use when querying an OpenAI compatible API. Leave blank for OpenAI."
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
        label="Embedding Model"
        hint="Leave blank for Plural default."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) => {
            updateSettings({ embeddingModel: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Endpoint"
        hint="The endpoint of your Azure OpenAI version. It should look like https://{endpoint}/openai/deployments."
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
        label="Embedding Model"
        hint="Leave blank for Plural default."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) => {
            updateSettings({ embeddingModel: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Access token"
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.accessToken}
          onChange={(e) => {
            updateSettings({ accessToken: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Region"
        required={enabled}
        flex={1}
      >
        <InputRevealer
          css={{ background: theme.colors['fill-two'] }}
          disabled={!enabled}
          value={settings?.region ?? undefined}
          onChange={(e) => {
            updateSettings({ region: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}

enum FileError {
  InvalidFormat = 'Invalid file format. Expected JSON.',
}

export function VertexSettings({
  enabled,
  settings,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['vertex']
  updateSettings: (
    update: NonNullable<Partial<AiSettingsAttributes['vertex']>>
  ) => void
}) {
  const [fileName, setFileName] = useState<string | undefined>()
  const [fileError, setFileError] = useState<FileError>()

  const readFile = useCallback<NonNullable<DropzoneOptions['onDrop']>>(
    async (files) => {
      if (isEmpty(files)) {
        return
      }
      const file = files?.[0]

      setFileName(file.name)

      if (file?.type !== 'application/json') {
        setFileError(FileError.InvalidFormat)
        updateSettings({ serviceAccountJson: '' })

        return
      }
      const content = await file.text()

      try {
        JSON.parse(content)
      } catch (_) {
        setFileError(FileError.InvalidFormat)
        updateSettings({ serviceAccountJson: '' })

        return
      }

      setFileError(undefined)
      updateSettings({ serviceAccountJson: content })
      setFileName(file.name)
    },
    [updateSettings]
  )

  return (
    <>
      <FormField
        label="Model"
        hint="The Model ID you want to use."
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
        label="Embedding Model"
        hint="Leave blank for Plural default."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) => {
            updateSettings({ embeddingModel: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Project"
        hint="The GCP Project ID"
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.project}
          onChange={(e) => {
            updateSettings({ project: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Location"
        hint="The GCP Location you're querying from."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.location}
          onChange={(e) => {
            updateSettings({ location: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField
        label="Service account"
        error={!!fileError}
        hint={fileError}
      >
        <FileDrop
          accept={{ 'application/json': [] }}
          onDrop={readFile}
          messages={{
            default: 'Drop your service account JSON here (optional)',
            reject: 'File must be JSON format',
          }}
          error={!!fileError}
          files={
            !!fileName && [
              <FileDropFile
                key="file"
                label={fileName}
                onClear={() => {
                  setFileName(undefined)
                  setFileError(undefined)
                  updateSettings({ serviceAccountJson: '' })
                }}
              />,
            ]
          }
        />
      </FormField>
    </>
  )
}
