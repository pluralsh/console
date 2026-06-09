import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'
import { FileDrop, FileDropFile } from 'components/utils/FileDrop.tsx'
import { isEmpty } from 'lodash'
import { useCallback, useState } from 'react'
import { DropzoneOptions } from 'react-dropzone'
import {
  AiProvider,
  AiSettings,
  AiSettingsAttributes,
  OpenAiMethod,
} from '../../../generated/graphql.ts'
import { InputRevealer } from '../../cd/providers/InputRevealer.tsx'

const modelTooltip =
  'Primary model for Explain/Fix with AI, Insights, and similar features.'
const embeddingModelTooltip = 'Model used for embeddings and vector search.'
const toolModelTooltip =
  'Model used for tool calls and general chat, which are less frequent and benefit from more complex reasoning.'
const bedrockModelIdTooltip =
  'Primary Bedrock model for Explain/Fix with AI, Insights, and similar features. Leave blank to use Plural defaults.'
const bedrockEmbeddingModelTooltip =
  'Bedrock model used for embeddings and vector search.'
const bedrockToolModelTooltip =
  'Bedrock model used for tool calls and general chat, which are less frequent and benefit from more complex reasoning.'

export const aiProviderToLabel = {
  [AiProvider.Openai]: 'OpenAI',
  [AiProvider.OpenaiCompatible]: 'OpenAI-compatible',
  [AiProvider.Anthropic]: 'Anthropic',
  [AiProvider.Azure]: 'Azure AI',
  [AiProvider.Bedrock]: 'AWS Bedrock',
  [AiProvider.Ollama]: 'Ollama',
  [AiProvider.Vertex]: 'Vertex AI',
} as const satisfies Record<AiProvider, string>

export function initialSettingsAttributes(
  ai: Nullable<AiSettings>
): Omit<AiSettingsAttributes, 'enabled' | 'provider'> {
  return ai
    ? {
        ...(ai.anthropic
          ? {
              anthropic: {
                model: ai.anthropic.model,
                toolModel: ai.anthropic.toolModel,
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
                toolModel: ai.azure.toolModel,
                accessToken: '',
              },
            }
          : {}),
        ...(ai.bedrock
          ? {
              bedrock: {
                modelId: ai.bedrock.modelId,
                toolModelId: ai.bedrock.toolModelId,
                embeddingModel: ai.bedrock.embeddingModel,
                awsAccessKeyId: ai.bedrock.accessKeyId,
                awsSecretAccessKey: '',
              },
            }
          : {}),
        ...(ai.ollama
          ? {
              ollama: {
                model: ai.ollama.model,
                toolModel: ai.ollama.toolModel,
                url: ai.ollama.url,
                authorization: '',
              },
            }
          : {}),
        ...(ai.openai
          ? {
              openai: {
                model: ai.openai.model,
                toolModel: ai.openai.toolModel,
                embeddingModel: ai.openai.embeddingModel,
                baseUrl: ai.openai.baseUrl,
                method: ai.openai.method,
                accessToken: '',
              },
            }
          : {}),
        ...(ai.openaiCompatible
          ? {
              openaiCompatible: {
                model: ai.openaiCompatible.model,
                toolModel: ai.openaiCompatible.toolModel,
                embeddingModel: ai.openaiCompatible.embeddingModel,
                baseUrl: ai.openaiCompatible.baseUrl,
                method: ai.openaiCompatible.method,
                accessToken: '',
              },
            }
          : {}),
        ...(ai.vertex
          ? {
              vertex: {
                model: ai.vertex.model,
                embeddingModel: ai.vertex.embeddingModel,
                toolModel: ai.vertex.toolModel,
                project: ai.vertex.project,
                location: ai.vertex.location,
                endpoint: ai.vertex.endpoint,
                serviceAccountJson: '',
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
    case AiProvider.OpenaiCompatible:
      return !!settings.openaiCompatible?.accessToken
    case AiProvider.Anthropic:
      return !!settings.anthropic?.accessToken
    case AiProvider.Bedrock:
      return true
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
  return (
    <>
      <FormField
        label="Model"
        infoTooltip={modelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => updateSettings({ model: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Embedding Model"
        infoTooltip={embeddingModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) =>
            updateSettings({ embeddingModel: e.currentTarget.value })
          }
        />
      </FormField>
      <FormField
        label="Tool model"
        infoTooltip={toolModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.toolModel}
          onChange={(e) => updateSettings({ toolModel: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Base URL"
        infoTooltip="Optional custom API base URL for OpenAI-compatible providers. Leave blank to use OpenAI."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.baseUrl}
          onChange={(e) => updateSettings({ baseUrl: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="API method"
        infoTooltip="Choose which OpenAI API style to use. Auto lets Plural select the best method for each request."
        flex={1}
      >
        <Select
          isDisabled={!enabled}
          selectedKey={settings?.method ?? OpenAiMethod.Auto}
          onSelectionChange={(key) =>
            updateSettings({ method: key as OpenAiMethod })
          }
        >
          <ListBoxItem
            key={OpenAiMethod.Auto}
            label="Auto"
          />
          <ListBoxItem
            key={OpenAiMethod.Responses}
            label="Responses API"
          />
          <ListBoxItem
            key={OpenAiMethod.Chat}
            label="Chat completions API"
          />
        </Select>
      </FormField>
      <FormField
        label="Access token"
        required={enabled}
        flex={1}
      >
        <InputRevealer
          disabled={!enabled}
          value={settings?.accessToken ?? undefined}
          onChange={(e) =>
            updateSettings({ accessToken: e.currentTarget.value })
          }
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
  return (
    <>
      <FormField
        label="Model"
        infoTooltip={modelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => updateSettings({ model: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Tool model"
        infoTooltip={toolModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.toolModel}
          onChange={(e) => updateSettings({ toolModel: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Access token"
        required={enabled}
        flex={1}
      >
        <InputRevealer
          disabled={!enabled}
          value={settings?.accessToken ?? undefined}
          onChange={(e) =>
            updateSettings({ accessToken: e.currentTarget.value })
          }
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
  return (
    <>
      <FormField
        label="Model ID"
        infoTooltip={bedrockModelIdTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.modelId}
          onChange={(e) => updateSettings({ modelId: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Embedding Model ID"
        infoTooltip={bedrockEmbeddingModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) =>
            updateSettings({ embeddingModel: e.currentTarget.value })
          }
        />
      </FormField>
      <FormField
        label="Tool model ID"
        infoTooltip={bedrockToolModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.toolModelId}
          onChange={(e) =>
            updateSettings({ toolModelId: e.currentTarget.value })
          }
        />
      </FormField>
      <FormField
        label="AWS access key ID"
        infoTooltip="Optional. Leave blank to authenticate with AWS via EKS Pod Identity instead."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.awsAccessKeyId}
          onChange={(e) =>
            updateSettings({ awsAccessKeyId: e.currentTarget.value })
          }
        />
      </FormField>
      <FormField
        label="AWS secret access key"
        infoTooltip="Optional. Leave blank to authenticate with AWS via EKS Pod Identity instead."
        flex={1}
      >
        <InputRevealer
          disabled={!enabled}
          value={settings?.awsSecretAccessKey ?? undefined}
          onChange={(e) =>
            updateSettings({ awsSecretAccessKey: e.currentTarget.value })
          }
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
  return (
    <>
      <FormField
        label="Model"
        infoTooltip={modelTooltip}
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => updateSettings({ model: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Tool model"
        infoTooltip={toolModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.toolModel}
          onChange={(e) => updateSettings({ toolModel: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="URL"
        infoTooltip="The URL your Ollama deployment is hosted on."
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.url}
          onChange={(e) => updateSettings({ url: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Authorization"
        infoTooltip="An HTTP Authorization header to use on calls to the Ollama API."
        required={enabled}
        flex={1}
      >
        <InputRevealer
          disabled={!enabled}
          value={settings?.authorization ?? undefined}
          onChange={(e) =>
            updateSettings({ authorization: e.currentTarget.value })
          }
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
  return (
    <>
      <FormField
        label="Model"
        infoTooltip={modelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => updateSettings({ model: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="API version"
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.apiVersion}
          onChange={(e) =>
            updateSettings({ apiVersion: e.currentTarget.value })
          }
        />
      </FormField>
      <FormField
        label="Embedding Model"
        infoTooltip={embeddingModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) =>
            updateSettings({ embeddingModel: e.currentTarget.value })
          }
        />
      </FormField>
      <FormField
        label="Tool model"
        infoTooltip={toolModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.toolModel}
          onChange={(e) => updateSettings({ toolModel: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Endpoint"
        infoTooltip="The endpoint of your Azure OpenAI version. It should look like https://{endpoint}/openai/deployments."
        required={enabled}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.endpoint}
          onChange={(e) => updateSettings({ endpoint: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Access token"
        infoTooltip="The Azure OpenAI access token to use."
        required={enabled}
        flex={1}
      >
        <InputRevealer
          disabled={!enabled}
          value={settings?.accessToken ?? undefined}
          onChange={(e) =>
            updateSettings({ accessToken: e.currentTarget.value })
          }
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
        infoTooltip={modelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.model}
          onChange={(e) => updateSettings({ model: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Embedding Model"
        infoTooltip={embeddingModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.embeddingModel}
          onChange={(e) =>
            updateSettings({ embeddingModel: e.currentTarget.value })
          }
        />
      </FormField>
      <FormField
        label="Project"
        infoTooltip="The GCP Project ID"
        flex={1}
        required={enabled}
      >
        <Input
          disabled={!enabled}
          value={settings?.project}
          onChange={(e) => updateSettings({ project: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Tool model"
        infoTooltip={toolModelTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.toolModel}
          onChange={(e) => updateSettings({ toolModel: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Location"
        infoTooltip="The GCP Location you're querying from."
        flex={1}
        required={enabled}
      >
        <Input
          disabled={!enabled}
          value={settings?.location}
          onChange={(e) => updateSettings({ location: e.currentTarget.value })}
        />
      </FormField>
      <FormField
        label="Endpoint"
        infoTooltip="Custom Vertex AI endpoint for dedicated deployments. Leave blank to use the default endpoint."
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.endpoint}
          onChange={(e) => updateSettings({ endpoint: e.currentTarget.value })}
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
