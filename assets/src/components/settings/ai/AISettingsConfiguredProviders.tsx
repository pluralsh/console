import {
  AwsLogoIcon,
  AzureLogoIcon,
  ClaudeLogoIcon,
  Flex,
  IconFrame,
  IconProps,
  OpenAILogoIcon,
  OllamaLogoIcon,
  OpenCodeLogoIcon,
  PencilIcon,
  Table,
  VertexLogoIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { AiProvider, AiSettings } from 'generated/graphql'
import { ComponentType, useMemo } from 'react'

type ConfiguredAiProvider = {
  provider: AiProvider
  name: string
}

type AISettingsProvidersTableMeta = {
  onEdit: (provider: AiProvider) => void
}

const aiProviderToLabel = {
  [AiProvider.Openai]: 'OpenAI',
  [AiProvider.OpenaiCompatible]: 'OpenAI-compatible',
  [AiProvider.Anthropic]: 'Anthropic',
  [AiProvider.Azure]: 'Azure AI',
  [AiProvider.Bedrock]: 'AWS Bedrock',
  [AiProvider.Ollama]: 'Ollama',
  [AiProvider.Vertex]: 'Vertex AI',
} as const satisfies Record<AiProvider, string>

const aiProviderToIcon = {
  [AiProvider.Openai]: OpenAILogoIcon,
  [AiProvider.OpenaiCompatible]: OpenCodeLogoIcon,
  [AiProvider.Anthropic]: ClaudeLogoIcon,
  [AiProvider.Azure]: AzureLogoIcon,
  [AiProvider.Bedrock]: AwsLogoIcon,
  [AiProvider.Ollama]: OllamaLogoIcon,
  [AiProvider.Vertex]: VertexLogoIcon,
} as const satisfies Record<AiProvider, ComponentType<IconProps>>

const configuredProviderSources = [
  [AiProvider.Openai, 'openai', 'model'],
  [AiProvider.OpenaiCompatible, 'openaiCompatible', 'model'],
  [AiProvider.Anthropic, 'anthropic', 'model'],
  [AiProvider.Azure, 'azure', 'model'],
  [AiProvider.Bedrock, 'bedrock', 'modelId'],
  [AiProvider.Ollama, 'ollama', 'model'],
  [AiProvider.Vertex, 'vertex', 'model'],
] as const satisfies readonly [
  AiProvider,
  keyof Pick<
    AiSettings,
    | 'openai'
    | 'openaiCompatible'
    | 'anthropic'
    | 'azure'
    | 'bedrock'
    | 'ollama'
    | 'vertex'
  >,
  'model' | 'modelId',
][]

const columnHelper = createColumnHelper<ConfiguredAiProvider>()

const columns = [
  columnHelper.accessor((row) => row, {
    id: 'Provider',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      const { provider, name } = getValue()
      const Icon = aiProviderToIcon[provider]

      return (
        <Flex
          align="center"
          gap="small"
        >
          <IconFrame
            size="medium"
            type="tertiary"
            tooltip={aiProviderToLabel[provider]}
            icon={<Icon fullColor />}
          />
          <span>{name}</span>
        </Flex>
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    meta: { gridTemplate: 'fit-content(100px)' },
    cell: function Cell({ row, table }) {
      const { onEdit } = table.options.meta as AISettingsProvidersTableMeta

      return (
        <Flex
          gap="xsmall"
          justify="flex-end"
        >
          <IconFrame
            clickable
            tooltip="Edit provider"
            icon={<PencilIcon />}
            onClick={() => onEdit(row.original.provider)}
          />
          <DeleteIconButton
            clickable={false}
            tooltip="Delete provider"
          />
        </Flex>
      )
    },
  }),
]

export function AISettingsConfiguredProviders({
  ai,
  onEdit,
}: {
  ai: Nullable<AiSettings>
  onEdit: (provider: AiProvider) => void
}) {
  const configuredProviders = useMemo(
    () =>
      ai
        ? configuredProviderSources.flatMap(([provider, key, modelKey]) => {
            const config = ai[key]
            if (!config) return []

            const model = config[modelKey]
            return [{ provider, name: model || aiProviderToLabel[provider] }]
          })
        : [],
    [ai]
  )

  return (
    <Table
      fillLevel={1}
      data={configuredProviders}
      columns={columns}
      reactTableOptions={{ meta: { onEdit } }}
      emptyStateProps={{ message: 'No providers configured.' }}
    />
  )
}
