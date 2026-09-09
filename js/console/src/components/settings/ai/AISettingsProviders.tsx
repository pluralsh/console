import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'
import { FileDrop, FileDropFile } from 'components/utils/FileDrop.tsx'
import { isEmpty } from 'lodash'
import { useCallback, useState } from 'react'
import { DropzoneOptions } from 'react-dropzone'
import {
  AiProvider,
  AiSettings,
  AiSettingsAttributes,
  ModelDefault,
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
const bedrockRegionTooltip = 'AWS region where your Bedrock models are hosted.'

const DEFAULT_BEDROCK_REGION = 'us-east-1'

// Usable Amazon Bedrock commercial and GovCloud regions.
// https://docs.aws.amazon.com/general/latest/gr/bedrock.html
const BEDROCK_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'ca-west-1', label: 'Canada West (Calgary)' },
  { value: 'mx-central-1', label: 'Mexico (Central)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'eu-central-2', label: 'Europe (Zurich)' },
  { value: 'eu-north-1', label: 'Europe (Stockholm)' },
  { value: 'eu-south-1', label: 'Europe (Milan)' },
  { value: 'eu-south-2', label: 'Europe (Spain)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-west-3', label: 'Europe (Paris)' },
  { value: 'af-south-1', label: 'Africa (Cape Town)' },
  { value: 'il-central-1', label: 'Israel (Tel Aviv)' },
  { value: 'me-central-1', label: 'Middle East (UAE)' },
  { value: 'me-south-1', label: 'Middle East (Bahrain)' },
  { value: 'ap-east-2', label: 'Asia Pacific (Taipei)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'ap-south-2', label: 'Asia Pacific (Hyderabad)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)' },
  { value: 'ap-southeast-4', label: 'Asia Pacific (Melbourne)' },
  { value: 'ap-southeast-5', label: 'Asia Pacific (Malaysia)' },
  { value: 'ap-southeast-6', label: 'Asia Pacific (New Zealand)' },
  { value: 'ap-southeast-7', label: 'Asia Pacific (Thailand)' },
  { value: 'us-gov-east-1', label: 'AWS GovCloud (US-East)' },
  { value: 'us-gov-west-1', label: 'AWS GovCloud (US-West)' },
] as const

export const aiProviderToLabel = {
  [AiProvider.Openai]: 'OpenAI',
  [AiProvider.OpenaiCompatible]: 'OpenAI-compatible',
  [AiProvider.Xai]: 'xAI',
  [AiProvider.Anthropic]: 'Anthropic',
  [AiProvider.Azure]: 'Azure AI',
  [AiProvider.Bedrock]: 'AWS Bedrock',
  [AiProvider.Ollama]: 'Ollama',
  [AiProvider.Vertex]: 'Vertex AI',
} as const satisfies Record<AiProvider, string>

type ModelDefaults = Pick<
  ModelDefault,
  'model' | 'toolModel' | 'embeddingModel'
>

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
        bedrock: {
          ...(ai.bedrock
            ? {
                modelId: ai.bedrock.modelId,
                toolModelId: ai.bedrock.toolModelId,
                embeddingModel: ai.bedrock.embeddingModel,
                awsAccessKeyId: ai.bedrock.accessKeyId,
              }
            : {}),
          awsSecretAccessKey: '',
          region: ai.bedrock?.region ?? DEFAULT_BEDROCK_REGION,
        },
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
        ...(ai.xai
          ? {
              xai: {
                model: ai.xai.model,
                toolModel: ai.xai.toolModel,
                embeddingModel: ai.xai.embeddingModel,
                baseUrl: ai.xai.baseUrl,
                method: ai.xai.method,
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
    : {
        bedrock: {
          awsSecretAccessKey: '',
          region: DEFAULT_BEDROCK_REGION,
        },
      }
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
    case AiProvider.Xai:
      return !!settings.xai?.accessToken
    case AiProvider.Anthropic:
      return !!settings.anthropic?.accessToken
    case AiProvider.Bedrock:
      return !!settings.bedrock?.region
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
  modelDefaults,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['openai']
  modelDefaults?: ModelDefaults
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
          value={settings?.model ?? modelDefaults?.model ?? ''}
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
          value={
            settings?.embeddingModel ?? modelDefaults?.embeddingModel ?? ''
          }
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
          value={settings?.toolModel ?? modelDefaults?.toolModel ?? ''}
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
  modelDefaults,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['anthropic']
  modelDefaults?: ModelDefaults
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
          value={settings?.model ?? modelDefaults?.model ?? ''}
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
          value={settings?.toolModel ?? modelDefaults?.toolModel ?? ''}
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
  modelDefaults,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['bedrock']
  modelDefaults?: ModelDefaults
  updateSettings: (
    update: NonNullable<Partial<AiSettingsAttributes['bedrock']>>
  ) => void
}) {
  const region = settings?.region ?? DEFAULT_BEDROCK_REGION
  const regionOptions =
    region && !BEDROCK_REGIONS.some(({ value }) => value === region)
      ? [...BEDROCK_REGIONS, { value: region, label: region }]
      : BEDROCK_REGIONS

  return (
    <>
      <FormField
        label="Region"
        infoTooltip={bedrockRegionTooltip}
        required={enabled}
        flex={1}
      >
        <Select
          isDisabled={!enabled}
          selectedKey={region}
          onSelectionChange={(key) => updateSettings({ region: String(key) })}
        >
          {regionOptions.map(({ value, label }) => (
            <ListBoxItem
              key={value}
              label={value}
              description={label}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        label="Model ID"
        infoTooltip={bedrockModelIdTooltip}
        flex={1}
      >
        <Input
          disabled={!enabled}
          value={settings?.modelId ?? modelDefaults?.model ?? ''}
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
          value={
            settings?.embeddingModel ?? modelDefaults?.embeddingModel ?? ''
          }
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
          value={settings?.toolModelId ?? modelDefaults?.toolModel ?? ''}
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
  modelDefaults,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['ollama']
  modelDefaults?: ModelDefaults
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
          value={settings?.model ?? modelDefaults?.model ?? ''}
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
          value={settings?.toolModel ?? modelDefaults?.toolModel ?? ''}
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
  modelDefaults,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['azure']
  modelDefaults?: ModelDefaults
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
          value={settings?.model ?? modelDefaults?.model ?? ''}
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
          value={
            settings?.embeddingModel ?? modelDefaults?.embeddingModel ?? ''
          }
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
          value={settings?.toolModel ?? modelDefaults?.toolModel ?? ''}
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
  modelDefaults,
  updateSettings,
}: {
  enabled: boolean
  settings: AiSettingsAttributes['vertex']
  modelDefaults?: ModelDefaults
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
          value={settings?.model ?? modelDefaults?.model ?? ''}
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
          value={
            settings?.embeddingModel ?? modelDefaults?.embeddingModel ?? ''
          }
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
          value={settings?.toolModel ?? modelDefaults?.toolModel ?? ''}
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
